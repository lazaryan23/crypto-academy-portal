import { cacheLife } from "next/cache";

export const LEVERAGE_TIERS = [
  { leverage: 10, weight: 0.35 },
  { leverage: 25, weight: 0.3 },
  { leverage: 50, weight: 0.2 },
  { leverage: 100, weight: 0.15 },
] as const;

export const MAP_COINS = ["BTC", "ETH", "SOL", "XRP", "DOGE"] as const;
export type MapCoin = (typeof MAP_COINS)[number];

export interface LeverageBucket {
  price: number;
  longUsd: number;
  shortUsd: number;
}

export interface LeverageMap {
  base: MapCoin;
  contract: string;
  price: number;
  lookbackHours: number;
  bucketSize: number;
  buckets: LeverageBucket[];
  updatedAt: string;
}

const TIMEOUT_MS = 8000;
const LOOKBACK_HOURS = 168;
const RANGE = 0.12;
const BUCKETS = 60;
const MAINTENANCE = 0.005;

type Level = { price: number; side: "long" | "short"; usd: number };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

export function liquidationPrice(entry: number, leverage: number, side: "long" | "short") {
  const distance = 1 / leverage - MAINTENANCE;
  return side === "long" ? entry * (1 - distance) : entry * (1 + distance);
}

export function buildLevels(
  candles: { open: number; high: number; low: number; close: number }[],
  openInterest: number[],
): Level[] {
  let levels: Level[] = [];
  for (let i = 1; i < candles.length; i++) {
    const previous = openInterest[i - 1];
    const current = openInterest[i];
    if (!(previous > 0) || !(current > 0)) continue;
    const candle = candles[i];
    if (current < previous) {
      const kept = current / previous;
      levels = levels.map((level) => ({ ...level, usd: level.usd * kept }));
    } else {
      const entry = (candle.open + candle.close) / 2;
      const notional = (current - previous) * entry;
      for (const tier of LEVERAGE_TIERS) {
        levels.push({ price: liquidationPrice(entry, tier.leverage, "long"), side: "long", usd: notional * tier.weight });
        levels.push({ price: liquidationPrice(entry, tier.leverage, "short"), side: "short", usd: notional * tier.weight });
      }
    }
    levels = levels.filter((level) => (level.side === "long" ? candle.low > level.price : candle.high < level.price));
  }
  return levels;
}

export function bucketLevels(levels: Level[], price: number): { bucketSize: number; buckets: LeverageBucket[] } {
  const low = price * (1 - RANGE);
  const bucketSize = (price * RANGE * 2) / BUCKETS;
  const buckets: LeverageBucket[] = Array.from({ length: BUCKETS }, (_, i) => ({ price: low + bucketSize * (i + 0.5), longUsd: 0, shortUsd: 0 }));
  for (const level of levels) {
    const index = Math.floor((level.price - low) / bucketSize);
    if (index < 0 || index >= BUCKETS) continue;
    if (level.side === "long" && level.price < price) buckets[index].longUsd += level.usd;
    if (level.side === "short" && level.price > price) buckets[index].shortUsd += level.usd;
  }
  return { bucketSize, buckets };
}

async function cachedLeverageMap(base: MapCoin): Promise<LeverageMap | null> {
  "use cache";
  try {
    const api = "https://fapi.binance.com";
    const contract = `${base}USDT`;
    const [klines, oi] = await Promise.all([
      getJson<[number, string, string, string, string][]>(`${api}/fapi/v1/klines?symbol=${contract}&interval=1h&limit=${LOOKBACK_HOURS}`),
      getJson<{ sumOpenInterest: string; timestamp: number }[]>(`${api}/futures/data/openInterestHist?symbol=${contract}&period=1h&limit=${LOOKBACK_HOURS}`),
    ]);
    const oiByHour = new Map(oi.map((row) => [Math.floor(row.timestamp / 3_600_000), Number(row.sumOpenInterest)]));
    const rows = klines
      .map((k) => ({
        hour: Math.floor(k[0] / 3_600_000),
        candle: { open: Number(k[1]), high: Number(k[2]), low: Number(k[3]), close: Number(k[4]) },
      }))
      .filter((row) => oiByHour.has(row.hour) && Object.values(row.candle).every((value) => value > 0));
    if (rows.length < 24) throw new Error("not enough history");
    const levels = buildLevels(
      rows.map((row) => row.candle),
      rows.map((row) => oiByHour.get(row.hour) ?? 0),
    );
    const price = rows[rows.length - 1].candle.close;
    const { bucketSize, buckets } = bucketLevels(levels, price);
    cacheLife({ stale: 120, revalidate: 300, expire: 3600 });
    return { base, contract, price, lookbackHours: rows.length, bucketSize, buckets, updatedAt: new Date().toISOString() };
  } catch {
    cacheLife({ stale: 0, revalidate: 20, expire: 300 });
    return null;
  }
}

export function isMapCoin(value: unknown): value is MapCoin {
  return typeof value === "string" && (MAP_COINS as readonly string[]).includes(value);
}

export function getLeverageMap(base: MapCoin) {
  return cachedLeverageMap(base);
}
