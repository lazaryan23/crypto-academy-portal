import { cacheLife } from "next/cache";
import type { ExchangeLongShort, LongShortCoin, LongShortExchange, LongShortSnapshot, LongShortTimeframe } from "@/lib/long-short-config";

export { isLongShortCoin, isLongShortTimeframe } from "@/lib/long-short-config";

const TIMEOUT_MS = 6000;

const WINDOWS: Record<LongShortTimeframe, { binance: string; bybit: string; okx: string; samples: number }> = {
  "1h": { binance: "5m", bybit: "5min", okx: "5m", samples: 12 },
  "4h": { binance: "1h", bybit: "1h", okx: "1H", samples: 4 },
  "24h": { binance: "1h", bybit: "1h", okx: "1H", samples: 24 },
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

function summarize(exchange: LongShortExchange, longShares: number[]): ExchangeLongShort | null {
  const valid = longShares.filter((share) => Number.isFinite(share) && share > 0 && share < 1);
  if (!valid.length) return null;
  const avg = valid.reduce((sum, share) => sum + share, 0) / valid.length;
  return { exchange, longPct: avg * 100, latestLongPct: valid[valid.length - 1] * 100, samples: valid.length };
}

async function binance(coin: LongShortCoin, tf: LongShortTimeframe) {
  const w = WINDOWS[tf];
  const rows = await getJson<{ longAccount: string }[]>(
    `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${coin}USDT&period=${w.binance}&limit=${w.samples}`,
  );
  return summarize(
    "Binance",
    rows.map((row) => Number(row.longAccount)),
  );
}

async function bybit(coin: LongShortCoin, tf: LongShortTimeframe) {
  const w = WINDOWS[tf];
  const body = await getJson<{ result?: { list?: { buyRatio: string }[] } }>(
    `https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=${coin}USDT&period=${w.bybit}&limit=${w.samples}`,
  );
  return summarize("Bybit", (body.result?.list ?? []).map((row) => Number(row.buyRatio)).reverse());
}

async function okx(coin: LongShortCoin, tf: LongShortTimeframe) {
  const w = WINDOWS[tf];
  const body = await getJson<{ data?: [string, string][] }>(
    `https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=${coin}&period=${w.okx}`,
  );
  const ratios = (body.data ?? [])
    .slice(0, w.samples)
    .map(([, ratio]) => Number(ratio))
    .reverse();
  return summarize(
    "OKX",
    ratios.map((ratio) => ratio / (1 + ratio)),
  );
}

async function cachedLongShort(coin: LongShortCoin, tf: LongShortTimeframe): Promise<LongShortSnapshot> {
  "use cache";
  const results = await Promise.all([binance(coin, tf), bybit(coin, tf), okx(coin, tf)].map((p) => p.catch(() => null)));
  const exchanges = results.filter((result): result is ExchangeLongShort => result !== null);
  const longPct = exchanges.length ? exchanges.reduce((sum, e) => sum + e.longPct, 0) / exchanges.length : null;
  cacheLife(exchanges.length ? { stale: 60, revalidate: tf === "1h" ? 120 : 300, expire: 1800 } : { stale: 0, revalidate: 30, expire: 120 });
  return { coin, timeframe: tf, longPct, exchanges, updatedAt: new Date().toISOString() };
}

export function getLongShort(coin: LongShortCoin, tf: LongShortTimeframe) {
  return cachedLongShort(coin, tf);
}
