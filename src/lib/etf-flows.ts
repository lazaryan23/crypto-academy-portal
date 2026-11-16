import { cacheLife } from "next/cache";
import type { EtfAsset, EtfFlowDay, EtfFlows, EtfIssuerFlow } from "@/lib/etf-flows-config";

const SOSOVALUE = "https://api.sosovalue.xyz/openapi/v2/etf";
const TIMEOUT_MS = 8000;
const DAYS = 30;

const SOSO_TYPES: Record<EtfAsset, string> = { BTC: "us-btc-spot", ETH: "us-eth-spot" };

const ISSUERS: Record<EtfAsset, { ticker: string; issuer: string; weight: number; aum: number }[]> = {
  BTC: [
    { ticker: "IBIT", issuer: "BlackRock", weight: 0.46, aum: 52e9 },
    { ticker: "FBTC", issuer: "Fidelity", weight: 0.2, aum: 18e9 },
    { ticker: "GBTC", issuer: "Grayscale", weight: -0.08, aum: 15e9 },
    { ticker: "ARKB", issuer: "ARK 21Shares", weight: 0.09, aum: 3.6e9 },
    { ticker: "BITB", issuer: "Bitwise", weight: 0.08, aum: 3.4e9 },
    { ticker: "BTC", issuer: "Grayscale Mini", weight: 0.07, aum: 3.1e9 },
    { ticker: "HODL", issuer: "VanEck", weight: 0.04, aum: 1.1e9 },
  ],
  ETH: [
    { ticker: "ETHA", issuer: "BlackRock", weight: 0.52, aum: 9e9 },
    { ticker: "FETH", issuer: "Fidelity", weight: 0.2, aum: 2.6e9 },
    { ticker: "ETHE", issuer: "Grayscale", weight: -0.1, aum: 3.9e9 },
    { ticker: "ETH", issuer: "Grayscale Mini", weight: 0.12, aum: 1.5e9 },
    { ticker: "ETHW", issuer: "Bitwise", weight: 0.08, aum: 0.4e9 },
  ],
};

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lastTradingDays(count: number, until: Date) {
  const days: string[] = [];
  const cursor = new Date(Date.UTC(until.getUTCFullYear(), until.getUTCMonth(), until.getUTCDate() - 1));
  while (days.length < count) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.unshift(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return days;
}

export function sampleEtfFlows(asset: EtfAsset, now = new Date()): EtfFlows {
  const dates = lastTradingDays(DAYS, now);
  const scale = asset === "BTC" ? 420e6 : 95e6;
  const days: EtfFlowDay[] = dates.map((date) => {
    const rand = seeded(Number(date.replaceAll("-", "")) + (asset === "BTC" ? 1 : 2));
    const swing = (rand() - 0.42) * 2;
    return { date, netFlowUsd: Math.round(swing * scale * (0.4 + rand())) };
  });
  const latest = days[days.length - 1].netFlowUsd;
  const issuers: EtfIssuerFlow[] = ISSUERS[asset].map((entry, i) => {
    const rand = seeded(Number(dates[dates.length - 1].replaceAll("-", "")) * 7 + i);
    return {
      ticker: entry.ticker,
      issuer: entry.issuer,
      dailyFlowUsd: Math.round(latest * entry.weight + (rand() - 0.5) * scale * 0.08),
      netAssetsUsd: entry.aum,
    };
  });
  return {
    asset,
    source: "sample",
    asOf: dates[dates.length - 1],
    days,
    cumulativeUsd: days.reduce((sum, day) => sum + day.netFlowUsd, 0),
    totalNetAssetsUsd: ISSUERS[asset].reduce((sum, entry) => sum + entry.aum, 0),
    issuers,
  };
}

async function soso<T>(path: string, asset: EtfAsset, apiKey: string): Promise<T> {
  const res = await fetch(`${SOSOVALUE}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-soso-api-key": apiKey },
    body: JSON.stringify({ type: SOSO_TYPES[asset] }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`SoSoValue ${path} → ${res.status}`);
  const body = (await res.json()) as { code: number; data: T };
  if (body.code !== 0) throw new Error(`SoSoValue ${path} code ${body.code}`);
  return body.data;
}

type SosoDay = { date: string; totalNetInflow: number; cumNetInflow: number; totalNetAssets: number };
type SosoMetric = { value: number | null };
type SosoCurrent = { list: { ticker: string; institute: string; dailyNetInflow: SosoMetric; netAssets: SosoMetric }[] };

async function liveEtfFlows(asset: EtfAsset, apiKey: string): Promise<EtfFlows> {
  const [history, current] = await Promise.all([
    soso<SosoDay[]>("historicalInflowChart", asset, apiKey),
    soso<SosoCurrent>("currentEtfDataMetrics", asset, apiKey),
  ]);
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) throw new Error("empty history");
  const recent = sorted.slice(-DAYS);
  const last = sorted[sorted.length - 1];
  return {
    asset,
    source: "sosovalue",
    asOf: last.date,
    days: recent.map((day) => ({ date: day.date, netFlowUsd: day.totalNetInflow })),
    cumulativeUsd: last.cumNetInflow,
    totalNetAssetsUsd: last.totalNetAssets ?? null,
    issuers: current.list
      .map((item) => ({ ticker: item.ticker, issuer: item.institute, dailyFlowUsd: item.dailyNetInflow.value ?? 0, netAssetsUsd: item.netAssets.value }))
      .sort((a, b) => (b.netAssetsUsd ?? 0) - (a.netAssetsUsd ?? 0)),
  };
}

async function cachedEtfFlows(asset: EtfAsset): Promise<EtfFlows> {
  "use cache";
  const apiKey = process.env.SOSOVALUE_API_KEY;
  if (apiKey) {
    try {
      const live = await liveEtfFlows(asset, apiKey);
      cacheLife({ stale: 600, revalidate: 1800, expire: 86400 });
      return live;
    } catch (error) {
      console.error(error);
      cacheLife({ stale: 0, revalidate: 120, expire: 600 });
      return sampleEtfFlows(asset);
    }
  }
  cacheLife("hours");
  return sampleEtfFlows(asset);
}

export function getEtfFlows(asset: EtfAsset) {
  return cachedEtfFlows(asset);
}
