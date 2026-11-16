import { cacheLife } from "next/cache";
import { commonDates, correlationMatrix, logReturns, type DailySeries } from "@/lib/correlation-math";
import { CORRELATION_ASSETS, CORRELATION_WINDOWS, type CorrelationSnapshot, type CorrelationWindow } from "@/lib/correlations-config";

const TIMEOUT_MS = 12_000;
const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

type YahooChart = { chart?: { result?: { timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] } };

async function fetchChart(symbol: string): Promise<YahooChart> {
  let lastError: unknown;
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; CoinCompass/1.0)", accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`${symbol} → ${res.status}`);
      return (await res.json()) as YahooChart;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function dailyCloses(symbol: string): Promise<DailySeries> {
  const body = await fetchChart(symbol);
  const result = body.chart?.result?.[0];
  const times = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const series: DailySeries = new Map();
  times.forEach((t, i) => {
    const close = closes[i];
    if (typeof close === "number" && close > 0) series.set(new Date(t * 1000).toISOString().slice(0, 10), close);
  });
  if (series.size < 60) throw new Error(`${symbol}: too little history`);
  return series;
}

async function cachedCorrelations(): Promise<CorrelationSnapshot | null> {
  "use cache";
  try {
    const series: DailySeries[] = [];
    for (let i = 0; i < CORRELATION_ASSETS.length; i += 3) {
      series.push(...(await Promise.all(CORRELATION_ASSETS.slice(i, i + 3).map((asset) => dailyCloses(asset.key)))));
    }
    const dates = commonDates(series);
    if (dates.length < Math.max(...CORRELATION_WINDOWS) + 1) throw new Error("not enough overlapping days");
    const returns = series.map((s) => logReturns(dates.map((date) => s.get(date) ?? 0)));
    const matrices = Object.fromEntries(CORRELATION_WINDOWS.map((w) => [w, correlationMatrix(returns, w)])) as Record<CorrelationWindow, (number | null)[][]>;
    const observations = Object.fromEntries(CORRELATION_WINDOWS.map((w) => [w, Math.min(w, returns[0].length)])) as Record<CorrelationWindow, number>;
    cacheLife({ stale: 3600, revalidate: 6 * 3600, expire: 86400 });
    return { assets: CORRELATION_ASSETS, matrices, observations, lastDate: dates[dates.length - 1], updatedAt: new Date().toISOString() };
  } catch (error) {
    console.error(error);
    cacheLife({ stale: 0, revalidate: 300, expire: 1800 });
    return null;
  }
}

export function getCorrelations() {
  return cachedCorrelations();
}
