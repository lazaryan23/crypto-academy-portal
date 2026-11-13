import { cacheLife } from "next/cache";

export const HISTORY_RANGES = ["1d", "7d", "30d"] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

export interface HistoryPoint {
  time: number;
  value: number;
}

export interface DerivativesHistory {
  base: string;
  source: "Binance" | "Bybit";
  contract: string;
  range: HistoryRange;
  price: HistoryPoint[];
  openInterest: HistoryPoint[];
  funding: HistoryPoint[];
  longShare: HistoryPoint[];
  topTraderLongShare: HistoryPoint[] | null;
  takerBuySell: HistoryPoint[] | null;
}

export type HistoryOutcome = { status: "ok"; data: DerivativesHistory } | { status: "unlisted" } | { status: "error" };

const TIMEOUT_MS = 8000;
const DAY_MS = 86_400_000;
const rangeDays: Record<HistoryRange, number> = { "1d": 1, "7d": 7, "30d": 30 };
const binancePeriods: Record<HistoryRange, { period: string; limit: number }> = {
  "1d": { period: "15m", limit: 96 },
  "7d": { period: "1h", limit: 168 },
  "30d": { period: "4h", limit: 180 },
};
const bybitPeriods: Record<HistoryRange, { oi: string; ratio: string; kline: string; limit: number }> = {
  "1d": { oi: "15min", ratio: "15min", kline: "15", limit: 96 },
  "7d": { oi: "1h", ratio: "1h", kline: "60", limit: 168 },
  "30d": { oi: "4h", ratio: "4h", kline: "240", limit: 180 },
};

class Unlisted extends Error {}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 400 || res.status === 404) throw new Unlisted();
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

function point(timeMs: unknown, value: unknown): HistoryPoint | null {
  const t = num(timeMs);
  const v = num(value);
  return t === null || v === null ? null : { time: Math.floor(t / 1000), value: v };
}

function clean(points: (HistoryPoint | null)[]): HistoryPoint[] {
  const seen = new Set<number>();
  return points
    .filter((p): p is HistoryPoint => p !== null)
    .sort((a, b) => a.time - b.time)
    .filter((p) => (seen.has(p.time) ? false : (seen.add(p.time), true)));
}

async function fromBinance(base: string, range: HistoryRange): Promise<DerivativesHistory> {
  const api = "https://fapi.binance.com";
  const { period, limit } = binancePeriods[range];
  type Oi = { sumOpenInterest: string; sumOpenInterestValue: string; timestamp: number };
  let contract = `${base}USDT`;
  let oi: Oi[];
  try {
    oi = await getJson<Oi[]>(`${api}/futures/data/openInterestHist?symbol=${contract}&period=${period}&limit=${limit}`);
  } catch (error) {
    if (!(error instanceof Unlisted)) throw error;
    contract = `1000${base}USDT`;
    oi = await getJson<Oi[]>(`${api}/futures/data/openInterestHist?symbol=${contract}&period=${period}&limit=${limit}`);
  }
  if (!oi.length) throw new Unlisted();
  const query = `symbol=${contract}&period=${period}&limit=${limit}`;
  const since = Date.now() - rangeDays[range] * DAY_MS;
  type Ratio = { longAccount: string; timestamp: number };
  const [funding, global, top, taker] = await Promise.all([
    getJson<{ fundingTime: number; fundingRate: string }[]>(`${api}/fapi/v1/fundingRate?symbol=${contract}&startTime=${since}&limit=1000`).catch(() => []),
    getJson<Ratio[]>(`${api}/futures/data/globalLongShortAccountRatio?${query}`).catch(() => []),
    getJson<Ratio[]>(`${api}/futures/data/topLongShortPositionRatio?${query}`).catch(() => null),
    getJson<{ buySellRatio: string; timestamp: number }[]>(`${api}/futures/data/takerlongshortRatio?${query}`).catch(() => null),
  ]);
  return {
    base,
    source: "Binance",
    contract,
    range,
    price: clean(
      oi.map((row) => {
        const contracts = num(row.sumOpenInterest);
        const value = num(row.sumOpenInterestValue);
        return contracts && value !== null ? point(row.timestamp, value / contracts) : null;
      }),
    ),
    openInterest: clean(oi.map((row) => point(row.timestamp, row.sumOpenInterestValue))),
    funding: clean(funding.map((row) => point(row.fundingTime, (num(row.fundingRate) ?? NaN) * 100))),
    longShare: clean(global.map((row) => point(row.timestamp, (num(row.longAccount) ?? NaN) * 100))),
    topTraderLongShare: top ? clean(top.map((row) => point(row.timestamp, (num(row.longAccount) ?? NaN) * 100))) : null,
    takerBuySell: taker ? clean(taker.map((row) => point(row.timestamp, row.buySellRatio))) : null,
  };
}

async function fromBybit(base: string, range: HistoryRange): Promise<DerivativesHistory> {
  const api = "https://api.bybit.com/v5/market";
  const { oi: oiInterval, ratio, kline, limit } = bybitPeriods[range];
  type Envelope<T> = { retCode: number; result: { list: T[] } };
  const load = async (contract: string) => {
    const body = await getJson<Envelope<{ openInterest: string; timestamp: string }>>(
      `${api}/open-interest?category=linear&symbol=${contract}&intervalTime=${oiInterval}&limit=${Math.min(limit, 200)}`,
    );
    if (body.retCode !== 0 || !body.result.list.length) throw new Unlisted();
    return body.result.list;
  };
  let contract = `${base}USDT`;
  let oi: { openInterest: string; timestamp: string }[];
  try {
    oi = await load(contract);
  } catch (error) {
    if (!(error instanceof Unlisted)) throw error;
    contract = `1000${base}USDT`;
    oi = await load(contract);
  }
  const since = Date.now() - rangeDays[range] * DAY_MS;
  const [candles, funding, accounts] = await Promise.all([
    getJson<Envelope<string[]>>(`${api}/mark-price-kline?category=linear&symbol=${contract}&interval=${kline}&limit=${Math.min(limit, 200)}`),
    getJson<Envelope<{ fundingRate: string; fundingRateTimestamp: string }>>(
      `${api}/funding/history?category=linear&symbol=${contract}&startTime=${since}&endTime=${Date.now()}&limit=200`,
    ).catch(() => null),
    getJson<Envelope<{ buyRatio: string; timestamp: string }>>(`${api}/account-ratio?category=linear&symbol=${contract}&period=${ratio}&limit=${limit}`).catch(() => null),
  ]);
  const closes = new Map(candles.result.list.map((row) => [Math.floor(Number(row[0]) / 1000), num(row[4])]));
  const price = clean(candles.result.list.map((row) => point(row[0], row[4])));
  return {
    base,
    source: "Bybit",
    contract,
    range,
    price,
    openInterest: clean(
      oi.map((row) => {
        const time = Math.floor(Number(row.timestamp) / 1000);
        const close = closes.get(time);
        const contracts = num(row.openInterest);
        return close && contracts !== null ? { time, value: contracts * close } : null;
      }),
    ),
    funding: clean((funding?.result.list ?? []).map((row) => point(row.fundingRateTimestamp, (num(row.fundingRate) ?? NaN) * 100))),
    longShare: clean((accounts?.result.list ?? []).map((row) => point(row.timestamp, (num(row.buyRatio) ?? NaN) * 100))),
    topTraderLongShare: null,
    takerBuySell: null,
  };
}

async function cachedHistory(base: string, range: HistoryRange): Promise<HistoryOutcome> {
  "use cache";
  let unlisted = 0;
  for (const source of [fromBinance, fromBybit]) {
    try {
      const data = await source(base, range);
      if (!data.openInterest.length) throw new Unlisted();
      cacheLife({ stale: 120, revalidate: 300, expire: 3600 });
      return { status: "ok", data };
    } catch (error) {
      if (error instanceof Unlisted) unlisted += 1;
    }
  }
  if (unlisted === 2) {
    cacheLife("hours");
    return { status: "unlisted" };
  }
  cacheLife({ stale: 0, revalidate: 20, expire: 300 });
  return { status: "error" };
}

export function isHistoryRange(value: unknown): value is HistoryRange {
  return typeof value === "string" && (HISTORY_RANGES as readonly string[]).includes(value);
}

export function getDerivativesHistory(symbol: string, range: HistoryRange = "7d") {
  const base = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!base || base.length > 15) return Promise.resolve<HistoryOutcome>({ status: "unlisted" });
  return cachedHistory(base, range);
}
