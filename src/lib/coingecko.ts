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

type Result<T> = { ok: true; data: T } | { ok: false; status: number };

const failureCacheLife = { stale: 0, revalidate: 15, expire: 60 };

async function request<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<Result<T>> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const headers: HeadersInit = { accept: "application/json" };
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 503 };
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
    per_page: category === "top" && !ids ? Math.min(perPage, 10) : perPage,
    page,
    sparkline: true,
    price_change_percentage: "1h,24h,7d",
  };
  if (ids?.length) params.ids = ids.join(",");
  if (category !== "top" && category !== "trending") params.category = categoryApiIds[category];

  return request<CoinMarket[]>("/coins/markets", params);
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
  cacheLife(result.ok ? { stale: 60, revalidate: days === "1" ? 120 : 900, expire: 86400 } : failureCacheLife);
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
