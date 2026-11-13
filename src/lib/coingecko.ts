import { cacheLife, cacheTag } from "next/cache";
import type {
  ChartRange,
  CoinDetail,
  CoinMarket,
  MarketCategory,
  MarketChart,
  SearchResponse,
  TrendingResponse,
} from "@/types/coingecko";

const BASE_URL = "https://api.coingecko.com/api/v3";

export const categoryApiIds: Record<Exclude<MarketCategory, "top" | "trending">, string> = {
  "layer-1": "layer-1",
  defi: "decentralized-finance-defi",
  meme: "meme-token",
};

export class CoinGeckoError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "CoinGeckoError";
  }
}

const excludedCoinIds = new Set([
  "figure-heloc",
  "staked-ether",
  "wrapped-steth",
  "wrapped-bitcoin",
  "weth",
  "wrapped-eeth",
  "coinbase-wrapped-btc",
  "binance-peg-weth",
  "binance-bridged-usdt-bnb-smart-chain",
  "blackrock-usd-institutional-digital-liquidity-fund",
  "ondo-us-dollar-yield",
  "usdtb",
]);

export function isListedCoin(coin: Pick<CoinMarket, "id" | "symbol">): boolean {
  return !excludedCoinIds.has(coin.id) && !coin.symbol.includes("_");
}

type Result<T> = { ok: true; data: T } | { ok: false; status: number };

const failureCacheLife = { stale: 0, revalidate: 15, expire: 300 };

async function request<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<Result<T>> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const headers: HeadersInit = { accept: "application/json" };
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

  const key = url.toString();
  let status: number;
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (res.ok) {
      const data = (await res.json()) as T;
      rememberResponse(key, data);
      return { ok: true, data };
    }
    status = res.status;
  } catch {
    status = 503;
  }
  const fallback = status === 429 || status >= 500 ? lastGoodResponses.get(key) : undefined;
  if (fallback && Date.now() - fallback.at < LAST_GOOD_MAX_AGE_MS) return { ok: true, data: fallback.data as T };
  return { ok: false, status };
}

const LAST_GOOD_MAX_AGE_MS = 6 * 3_600_000;
const LAST_GOOD_LIMIT = 300;
const lastGoodResponses = new Map<string, { at: number; data: unknown }>();

function rememberResponse(key: string, data: unknown) {
  lastGoodResponses.delete(key);
  lastGoodResponses.set(key, { at: Date.now(), data });
  if (lastGoodResponses.size > LAST_GOOD_LIMIT) {
    const oldest = lastGoodResponses.keys().next().value;
    if (oldest !== undefined) lastGoodResponses.delete(oldest);
  }
}

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new CoinGeckoError(`CoinGecko request failed [status:${result.status}]`, result.status);
  return result.data;
}

export function getErrorStatus(error: unknown): number | null {
  if (error instanceof CoinGeckoError) return error.status;
  const match = error instanceof Error ? error.message.match(/\[status:(\d{3})\]/) : null;
  return match ? Number(match[1]) : null;
}

export interface MarketsQuery {
  category?: MarketCategory;
  ids?: string[];
  perPage?: number;
  page?: number;
}

async function fetchMarkets({ category = "top", ids, perPage = 50, page = 1 }: MarketsQuery): Promise<Result<CoinMarket[]>> {
  if (category === "trending" && !ids) {
    const trending = await fetchTrending();
    if (!trending.ok) return trending;
    const trendingIds = trending.data.coins.map((c) => c.item.id);
    if (trendingIds.length === 0) return { ok: true, data: [] };
    const rows = await fetchMarkets({ ids: trendingIds, perPage: trendingIds.length });
    if (!rows.ok) return rows;
    const order = new Map(trendingIds.map((id, i) => [id, i]));
    return { ok: true, data: rows.data.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)) };
  }

  const params: Record<string, string | number | boolean> = {
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: perPage,
    page,
    sparkline: true,
    price_change_percentage: "1h,24h,7d",
  };
  if (ids?.length) params.ids = ids.join(",");
  if (category !== "top" && category !== "trending") params.category = categoryApiIds[category];

  const result = await request<CoinMarket[]>("/coins/markets", params);
  if (!result.ok || ids) return result;
  return { ok: true, data: result.data.filter(isListedCoin) };
}

export const TOP_MARKETS_LIMIT = 100;

async function cachedTopMarkets(): Promise<Result<CoinMarket[]>> {
  "use cache";
  cacheTag("markets");
  const result = await request<CoinMarket[]>("/coins/markets", {
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: TOP_MARKETS_LIMIT,
    page: 1,
    sparkline: true,
    price_change_percentage: "1h,24h,7d",
  });
  cacheLife(result.ok ? { stale: 60, revalidate: 60, expire: 3600 } : failureCacheLife);
  return result.ok ? { ok: true, data: result.data.filter(isListedCoin) } : result;
}

export async function getTopMarkets(limit = TOP_MARKETS_LIMIT): Promise<CoinMarket[]> {
  return unwrap(await cachedTopMarkets()).slice(0, limit);
}

function fetchTrending(): Promise<Result<TrendingResponse>> {
  return request<TrendingResponse>("/search/trending");
}

async function cachedMarkets(query: MarketsQuery): Promise<Result<CoinMarket[]>> {
  "use cache";
  cacheTag("markets");
  const result = await fetchMarkets(query);
  cacheLife(result.ok ? { stale: 60, revalidate: 60, expire: 3600 } : failureCacheLife);
  return result;
}

export async function getMarkets(query: MarketsQuery = {}): Promise<CoinMarket[]> {
  if ((query.category ?? "top") === "top" && !query.ids) return getTopMarkets(Math.min(query.perPage ?? 10, 10));
  return unwrap(await cachedMarkets(query));
}

async function cachedCoin(id: string): Promise<Result<CoinDetail>> {
  "use cache";
  cacheTag(`coin:${id}`);
  const result = await request<CoinDetail>(`/coins/${encodeURIComponent(id)}`, {
    localization: false,
    tickers: false,
    market_data: true,
    community_data: false,
    developer_data: false,
    sparkline: false,
  });
  if (result.ok) cacheLife({ stale: 60, revalidate: 120, expire: 86400 });
  else if (result.status === 404) cacheLife("hours");
  else cacheLife(failureCacheLife);
  return result;
}

export async function getCoin(id: string): Promise<CoinDetail | null> {
  const result = await cachedCoin(id);
  if (!result.ok && result.status === 404) return null;
  return unwrap(result);
}

async function cachedMarketChart(id: string, days: ChartRange): Promise<Result<MarketChart>> {
  "use cache";
  const result = await request<MarketChart>(`/coins/${encodeURIComponent(id)}/market_chart`, {
    vs_currency: "usd",
    days,
  });
  cacheLife(result.ok ? { stale: 60, revalidate: days === "1" ? 120 : days === "7" ? 900 : 3600, expire: 86400 } : failureCacheLife);
  return result;
}

export async function getMarketChart(id: string, days: ChartRange): Promise<MarketChart> {
  return unwrap(await cachedMarketChart(id, days));
}

async function cachedSearch(query: string): Promise<Result<SearchResponse>> {
  "use cache";
  const result = await request<SearchResponse>("/search", { query });
  cacheLife(result.ok ? { stale: 300, revalidate: 3600, expire: 86400 } : failureCacheLife);
  return result;
}

export async function searchCoins(query: string): Promise<SearchResponse> {
  return unwrap(await cachedSearch(query));
}

export async function getTopCoinIds(limit = TOP_MARKETS_LIMIT): Promise<string[]> {
  const result = await cachedTopMarkets();
  return result.ok ? result.data.slice(0, limit).map((c) => c.id) : [];
}

export interface GlobalMarket {
  totalMarketCapUsd: number;
  marketCapChange24h: number | null;
  totalVolumeUsd: number | null;
  btcDominance: number | null;
  btcPriceUsd: number | null;
}

type GlobalResponse = {
  data: {
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
  };
};

async function cachedGlobal(): Promise<Result<GlobalMarket>> {
  "use cache";
  const result = await request<GlobalResponse>("/global");
  if (!result.ok) {
    cacheLife(failureCacheLife);
    return result;
  }
  cacheLife({ stale: 120, revalidate: 300, expire: 3600 });
  const { total_market_cap, total_volume, market_cap_percentage, market_cap_change_percentage_24h_usd } = result.data.data;
  return {
    ok: true,
    data: {
      totalMarketCapUsd: total_market_cap.usd,
      marketCapChange24h: market_cap_change_percentage_24h_usd ?? null,
      totalVolumeUsd: total_volume.usd ?? null,
      btcDominance: market_cap_percentage.btc ?? null,
      btcPriceUsd: total_market_cap.btc ? total_market_cap.usd / total_market_cap.btc : null,
    },
  };
}

export async function getGlobalMarket(): Promise<GlobalMarket | null> {
  const result = await cachedGlobal();
  return result.ok ? result.data : null;
}

async function cachedFuturesOpenInterestBtc(): Promise<Result<number>> {
  "use cache";
  const result = await request<{ open_interest_btc: number | null }[]>("/derivatives/exchanges", {
    order: "open_interest_btc_desc",
    per_page: 20,
  });
  if (!result.ok) {
    cacheLife(failureCacheLife);
    return result;
  }
  cacheLife({ stale: 300, revalidate: 600, expire: 7200 });
  return { ok: true, data: result.data.reduce((sum, exchange) => sum + (exchange.open_interest_btc ?? 0), 0) };
}

export async function getFuturesOpenInterestBtc(): Promise<number | null> {
  const result = await cachedFuturesOpenInterestBtc();
  return result.ok && result.data > 0 ? result.data : null;
}
