export const COMPASS_TIMEFRAMES = ["15m", "1h", "4h"] as const;
export type CompassTimeframe = (typeof COMPASS_TIMEFRAMES)[number];

export const TIMEFRAME_MINUTES: Record<CompassTimeframe, number> = { "15m": 15, "1h": 60, "4h": 240 };
export const TIMEFRAME_LABELS: Record<CompassTimeframe, string> = { "15m": "15m", "1h": "1H", "4h": "4H" };

export const MINUTE_MS = 60_000;
export const SERIES_MINUTES = 241;

export interface CompassSeries {
  start: number;
  qv: number[];
  tb: number[];
  c: number[];
}

export interface CompassCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  rank: number | null;
  linked: boolean;
  contract: string;
  baselinePerMin: number;
  series: CompassSeries;
}

export interface CompassSnapshot {
  asOf: number;
  source: "Binance USDT-M perpetuals";
  coins: CompassCoin[];
}

export interface PressureReading {
  id: string;
  symbol: string;
  name: string;
  image: string;
  rank: number | null;
  linked: boolean;
  contract: string;
  buyUsd: number;
  sellUsd: number;
  netUsd: number;
  volumeUsd: number;
  buyShare: number;
  imbalance: number;
  spike: number | null;
  priceChange: number | null;
  index: number;
  eligible: boolean;
}

const INDEX_GAIN = 3.5;
const MAX_SPIKE_WEIGHT = 4;
const MIN_SPIKE_WEIGHT = 0.1;
const LIQUIDITY_PERCENTILE = 0.25;

export function computeIndex(imbalance: number, spike: number | null) {
  const weight = Math.sqrt(Math.min(Math.max(spike ?? 1, MIN_SPIKE_WEIGHT), MAX_SPIKE_WEIGHT));
  return 50 + 50 * Math.tanh(INDEX_GAIN * imbalance * weight);
}

export function readCoin(coin: CompassCoin, minutes: number, now: number): Omit<PressureReading, "eligible"> {
  const { series } = coin;
  const currentMinute = Math.floor(now / MINUTE_MS) * MINUTE_MS;
  const lastIndex = Math.min(series.qv.length - 1, Math.floor((currentMinute - series.start) / MINUTE_MS));
  const firstIndex = Math.max(0, lastIndex - minutes + 1);

  let volumeUsd = 0;
  let buyUsd = 0;
  for (let i = firstIndex; i <= lastIndex; i++) {
    volumeUsd += series.qv[i] ?? 0;
    buyUsd += series.tb[i] ?? 0;
  }
  buyUsd = Math.min(buyUsd, volumeUsd);
  const sellUsd = volumeUsd - buyUsd;
  const netUsd = buyUsd - sellUsd;
  const imbalance = volumeUsd > 0 ? netUsd / volumeUsd : 0;

  const covered = lastIndex - firstIndex + 1;
  const expected = coin.baselinePerMin * Math.max(covered, 1);
  const spike = coin.baselinePerMin > 0 && covered > 0 ? volumeUsd / expected : null;

  const reference = firstIndex > 0 ? series.c[firstIndex - 1] : series.c[firstIndex];
  const last = lastIndex >= 0 ? series.c[lastIndex] : undefined;
  const priceChange = reference && last ? ((last - reference) / reference) * 100 : null;

  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    image: coin.image,
    rank: coin.rank,
    linked: coin.linked,
    contract: coin.contract,
    buyUsd,
    sellUsd,
    netUsd,
    volumeUsd,
    buyShare: volumeUsd > 0 ? buyUsd / volumeUsd : 0.5,
    imbalance,
    spike,
    priceChange,
    index: computeIndex(imbalance, spike),
  };
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

export function readAll(coins: CompassCoin[], timeframe: CompassTimeframe, now: number): PressureReading[] {
  const minutes = TIMEFRAME_MINUTES[timeframe];
  const raw = coins.map((coin) => readCoin(coin, minutes, now));
  const floor = percentile(
    raw.map((r) => r.volumeUsd),
    LIQUIDITY_PERCENTILE,
  );
  return raw
    .map((r) => ({ ...r, eligible: r.volumeUsd > 0 && r.volumeUsd >= floor && r.netUsd > 0 }))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.index - a.index);
}

export function upsertMinute(series: CompassSeries, openTime: number, quoteVolume: number, takerBuyQuote: number, close: number) {
  const index = Math.round((openTime - series.start) / MINUTE_MS);
  if (index < 0) return false;
  while (series.qv.length < index) {
    series.qv.push(0);
    series.tb.push(0);
    series.c.push(series.c[series.c.length - 1] ?? close);
  }
  if (index === series.qv.length) {
    series.qv.push(quoteVolume);
    series.tb.push(takerBuyQuote);
    series.c.push(close);
  } else {
    if (quoteVolume < series.qv[index]) return false;
    series.qv[index] = quoteVolume;
    series.tb[index] = takerBuyQuote;
    series.c[index] = close;
  }
  const overflow = series.qv.length - (SERIES_MINUTES + 30);
  if (overflow > 0) {
    series.qv.splice(0, overflow);
    series.tb.splice(0, overflow);
    series.c.splice(0, overflow);
    series.start += overflow * MINUTE_MS;
  }
  return true;
}

export function mergeSeries(fresh: CompassSeries, previous: CompassSeries | undefined): CompassSeries {
  if (!previous) return fresh;
  const merged: CompassSeries = { start: fresh.start, qv: [...fresh.qv], tb: [...fresh.tb], c: [...fresh.c] };
  for (let i = 0; i < previous.qv.length; i++) {
    const openTime = previous.start + i * MINUTE_MS;
    if (openTime < fresh.start) continue;
    upsertMinute(merged, openTime, previous.qv[i], previous.tb[i], previous.c[i]);
  }
  return merged;
}

export function describeIndex(index: number) {
  if (index >= 75) return { label: "Strong buying", color: "teal" };
  if (index >= 58) return { label: "Buyers in control", color: "teal" };
  if (index > 42) return { label: "Balanced", color: "gray" };
  if (index > 25) return { label: "Sellers in control", color: "red" };
  return { label: "Strong selling", color: "red" };
}
