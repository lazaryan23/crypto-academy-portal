import { cacheLife } from "next/cache";
import { maxPain, type ExpirySummary, type OptionCurrency, type OptionsOverview, type StrikeRow } from "@/lib/options-math";

const API = "https://www.deribit.com/api/v2/public";
const TIMEOUT_MS = 8000;
const DAY_MS = 86_400_000;
const FAILURE_LIFE = { stale: 0, revalidate: 20, expire: 300 };
const MONTHS: Record<string, number> = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };

type BookSummary = {
  instrument_name: string;
  open_interest: number;
  volume: number;
  mark_iv: number | null;
  underlying_price: number | null;
};

async function getResult<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message?: string } };
  if (body.result === undefined) throw new Error(body.error?.message ?? "empty result");
  return body.result;
}

export function parseExpiry(code: string): number | null {
  const match = code.match(/^(\d{1,2})([A-Z]{3})(\d{2})$/);
  if (!match || MONTHS[match[2]] === undefined) return null;
  return Date.UTC(2000 + Number(match[3]), MONTHS[match[2]], Number(match[1]), 8);
}

function summarize(code: string, expiry: number, instruments: { strike: number; type: "C" | "P"; item: BookSummary }[], indexPrice: number): ExpirySummary {
  const byStrike = new Map<number, StrikeRow>();
  let callOi = 0;
  let putOi = 0;
  let callVolume = 0;
  let putVolume = 0;
  let underlying: number | null = null;
  for (const { strike, type, item } of instruments) {
    const row = byStrike.get(strike) ?? { strike, callOi: 0, putOi: 0 };
    if (type === "C") {
      row.callOi += item.open_interest;
      callOi += item.open_interest;
      callVolume += item.volume;
    } else {
      row.putOi += item.open_interest;
      putOi += item.open_interest;
      putVolume += item.volume;
    }
    byStrike.set(strike, row);
    underlying ??= item.underlying_price;
  }
  const strikes = [...byStrike.values()].sort((a, b) => a.strike - b.strike);
  const spot = underlying ?? indexPrice;
  const nearest = strikes.reduce<number | null>((best, row) => (best === null || Math.abs(row.strike - spot) < Math.abs(best - spot) ? row.strike : best), null);
  const atmIvs = instruments.filter((entry) => entry.strike === nearest && entry.item.mark_iv).map((entry) => entry.item.mark_iv as number);
  return {
    code,
    expiry,
    callOi,
    putOi,
    callVolume,
    putVolume,
    notionalUsd: (callOi + putOi) * indexPrice,
    maxPain: maxPain(strikes.filter((row) => row.callOi + row.putOi > 0)),
    atmIv: atmIvs.length ? atmIvs.reduce((sum, iv) => sum + iv, 0) / atmIvs.length : null,
    strikes: strikes.filter((row) => row.callOi + row.putOi > 0),
  };
}

async function cachedDvol(currency: OptionCurrency): Promise<OptionsOverview["dvol"]> {
  "use cache";
  try {
    const end = Date.now();
    const result = await getResult<{ data: [number, number, number, number, number][] }>(
      `${API}/get_volatility_index_data?currency=${currency}&start_timestamp=${end - 30 * DAY_MS}&end_timestamp=${end}&resolution=3600`,
    );
    const seen = new Set<number>();
    const history = result.data
      .map((row) => [row[0], row[4]] as [number, number])
      .filter(([time, value]) => Number.isFinite(value) && !seen.has(time) && Boolean(seen.add(time)))
      .sort((a, b) => a[0] - b[0]);
    if (!history.length) throw new Error("empty");
    const current = history[history.length - 1][1];
    const dayAgo = history.find((row) => row[0] >= history[history.length - 1][0] - DAY_MS)?.[1] ?? null;
    cacheLife({ stale: 300, revalidate: 600, expire: 3600 });
    return { current, change24h: dayAgo ? current - dayAgo : null, history };
  } catch {
    cacheLife(FAILURE_LIFE);
    return null;
  }
}

async function cachedOptions(currency: OptionCurrency): Promise<OptionsOverview | null> {
  "use cache";
  try {
    const [book, index, dvol] = await Promise.all([
      getResult<BookSummary[]>(`${API}/get_book_summary_by_currency?currency=${currency}&kind=option`),
      getResult<{ index_price: number }>(`${API}/get_index_price?index_name=${currency.toLowerCase()}_usd`),
      cachedDvol(currency),
    ]);
    const indexPrice = index.index_price;
    const now = Date.now();
    const groups = new Map<string, { strike: number; type: "C" | "P"; item: BookSummary }[]>();
    for (const item of book) {
      const [, code, strike, type] = item.instrument_name.split("-");
      if ((type !== "C" && type !== "P") || !Number(strike)) continue;
      const list = groups.get(code) ?? [];
      list.push({ strike: Number(strike), type, item });
      groups.set(code, list);
    }
    const expiries = [...groups.entries()]
      .map(([code, instruments]) => ({ code, expiry: parseExpiry(code), instruments }))
      .filter((group): group is { code: string; expiry: number; instruments: typeof group.instruments } => group.expiry !== null && group.expiry > now)
      .sort((a, b) => a.expiry - b.expiry)
      .map((group) => summarize(group.code, group.expiry, group.instruments, indexPrice))
      .filter((summary) => summary.callOi + summary.putOi > 0);
    if (!expiries.length || !(indexPrice > 0)) throw new Error("empty");
    cacheLife({ stale: 120, revalidate: 300, expire: 3600 });
    return {
      currency,
      indexPrice,
      callOi: expiries.reduce((sum, e) => sum + e.callOi, 0),
      putOi: expiries.reduce((sum, e) => sum + e.putOi, 0),
      callVolume: expiries.reduce((sum, e) => sum + e.callVolume, 0),
      putVolume: expiries.reduce((sum, e) => sum + e.putVolume, 0),
      expiries,
      dvol,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    cacheLife(FAILURE_LIFE);
    return null;
  }
}

export function getOptionsOverview(currency: OptionCurrency) {
  return cachedOptions(currency);
}
