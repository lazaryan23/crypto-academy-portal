import { cacheLife } from "next/cache";

export type DerivativesSource = "Binance" | "Bybit" | "OKX";

export interface DerivativesSnapshot {
  source: DerivativesSource;
  contract: string;
  fundingRate: number;
  fundingIntervalHours: number;
  nextFundingTime: number | null;
  openInterestUsd: number | null;
  longPct: number | null;
  shortPct: number | null;
  markPrice: number | null;
}

type Outcome = { status: "ok"; data: DerivativesSnapshot } | { status: "unlisted" } | { status: "error" };

const TIMEOUT_MS = 6000;

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

async function fromBinance(base: string): Promise<DerivativesSnapshot> {
  const api = "https://fapi.binance.com";
  let contract = `${base}USDT`;
  type Premium = { symbol: string; markPrice: string; lastFundingRate: string; nextFundingTime: number };
  let premium: Premium;
  try {
    premium = await getJson<Premium>(`${api}/fapi/v1/premiumIndex?symbol=${contract}`);
  } catch (error) {
    if (!(error instanceof Unlisted)) throw error;
    contract = `1000${base}USDT`;
    premium = await getJson<Premium>(`${api}/fapi/v1/premiumIndex?symbol=${contract}`);
  }
  const [oi, ratio, fundingInfo] = await Promise.all([
    getJson<{ openInterest: string }>(`${api}/fapi/v1/openInterest?symbol=${contract}`).catch(() => null),
    getJson<{ longAccount: string; shortAccount: string }[]>(
      `${api}/futures/data/globalLongShortAccountRatio?symbol=${contract}&period=5m&limit=1`,
    ).catch(() => null),
    getJson<{ symbol: string; fundingIntervalHours: number }[]>(`${api}/fapi/v1/fundingInfo`).catch(() => null),
  ]);
  const markPrice = num(premium.markPrice);
  const contracts = num(oi?.openInterest);
  return {
    source: "Binance",
    contract,
    fundingRate: num(premium.lastFundingRate) ?? 0,
    fundingIntervalHours: fundingInfo?.find((f) => f.symbol === contract)?.fundingIntervalHours ?? 8,
    nextFundingTime: num(premium.nextFundingTime),
    openInterestUsd: contracts !== null && markPrice !== null ? contracts * markPrice : null,
    longPct: ratio?.[0] ? (num(ratio[0].longAccount) ?? 0) * 100 : null,
    shortPct: ratio?.[0] ? (num(ratio[0].shortAccount) ?? 0) * 100 : null,
    markPrice,
  };
}

async function fromBybit(base: string): Promise<DerivativesSnapshot> {
  const api = "https://api.bybit.com/v5/market";
  const contract = `${base}USDT`;
  type Ticker = { markPrice: string; fundingRate: string; nextFundingTime: string; openInterestValue: string; fundingIntervalHour?: string };
  const tickers = await getJson<{ retCode: number; result: { list: Ticker[] } }>(`${api}/tickers?category=linear&symbol=${contract}`);
  const ticker = tickers.retCode === 0 ? tickers.result.list[0] : undefined;
  if (!ticker) throw new Unlisted();
  const ratio = await getJson<{ result: { list: { buyRatio: string; sellRatio: string }[] } }>(
    `${api}/account-ratio?category=linear&symbol=${contract}&period=5min&limit=1`,
  ).catch(() => null);
  const latest = ratio?.result.list[0];
  return {
    source: "Bybit",
    contract,
    fundingRate: num(ticker.fundingRate) ?? 0,
    fundingIntervalHours: num(ticker.fundingIntervalHour) ?? 8,
    nextFundingTime: num(ticker.nextFundingTime),
    openInterestUsd: num(ticker.openInterestValue),
    longPct: latest ? (num(latest.buyRatio) ?? 0) * 100 : null,
    shortPct: latest ? (num(latest.sellRatio) ?? 0) * 100 : null,
    markPrice: num(ticker.markPrice),
  };
}

async function fromOkx(base: string): Promise<DerivativesSnapshot> {
  const api = "https://www.okx.com/api/v5";
  const contract = `${base}-USDT-SWAP`;
  type Envelope<T> = { code: string; data: T[] };
  const funding = await getJson<Envelope<{ fundingRate: string; fundingTime: string; nextFundingTime: string }>>(
    `${api}/public/funding-rate?instId=${contract}`,
  );
  const rate = funding.code === "0" ? funding.data[0] : undefined;
  if (!rate) throw new Unlisted();
  const [oi, ratio, mark] = await Promise.all([
    getJson<Envelope<{ oiUsd: string }>>(`${api}/public/open-interest?instType=SWAP&instId=${contract}`).catch(() => null),
    getJson<Envelope<[string, string]>>(`${api}/rubik/stat/contracts/long-short-account-ratio?ccy=${base}&period=5m`).catch(() => null),
    getJson<Envelope<{ markPx: string }>>(`${api}/public/mark-price?instType=SWAP&instId=${contract}`).catch(() => null),
  ]);
  const ratioValue = num(ratio?.data[0]?.[1]);
  const fundingTime = num(rate.fundingTime);
  const nextFundingTime = num(rate.nextFundingTime);
  return {
    source: "OKX",
    contract,
    fundingRate: num(rate.fundingRate) ?? 0,
    fundingIntervalHours: fundingTime && nextFundingTime ? Math.round((nextFundingTime - fundingTime) / 3_600_000) || 8 : 8,
    nextFundingTime: fundingTime,
    openInterestUsd: num(oi?.data[0]?.oiUsd),
    longPct: ratioValue !== null ? (ratioValue / (1 + ratioValue)) * 100 : null,
    shortPct: ratioValue !== null ? (1 / (1 + ratioValue)) * 100 : null,
    markPrice: num(mark?.data[0]?.markPx),
  };
}

const sources = [fromBinance, fromBybit, fromOkx];

async function cachedDerivatives(base: string): Promise<Outcome> {
  "use cache";
  let unlisted = 0;
  for (const source of sources) {
    try {
      const data = await source(base);
      cacheLife({ stale: 60, revalidate: 120, expire: 3600 });
      return { status: "ok", data };
    } catch (error) {
      if (error instanceof Unlisted) unlisted += 1;
    }
  }
  if (unlisted === sources.length) {
    cacheLife("hours");
    return { status: "unlisted" };
  }
  cacheLife({ stale: 0, revalidate: 30, expire: 120 });
  return { status: "error" };
}

const nonPerpetualSymbols = new Set(["USDT", "USDC", "DAI", "FDUSD", "USDE", "TUSD", "PYUSD", "USDS", "BUSD"]);

export async function getDerivatives(symbol: string): Promise<Outcome> {
  const base = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!base || nonPerpetualSymbols.has(base)) return { status: "unlisted" };
  return cachedDerivatives(base);
}
