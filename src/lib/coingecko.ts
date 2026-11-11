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

async function request<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  const headers: HeadersInit = { accept: "application/json" };
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new CoinGeckoError(`CoinGecko request failed [status:${res.status}]`, res.status);
  return (await res.json()) as T;
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

export async function getMarkets({ category = "top", ids, perPage = 50, page = 1 }: MarketsQuery = {}): Promise<CoinMarket[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });
  cacheTag("markets");

  if (category === "trending" && !ids) {
    const trending = await getTrending();
    const trendingIds = trending.coins.map((c) => c.item.id);
    if (trendingIds.length === 0) return [];
    const rows = await getMarkets({ ids: trendingIds, perPage: trendingIds.length });
    const order = new Map(trendingIds.map((id, i) => [id, i]));
    return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
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

export async function getTrending(): Promise<TrendingResponse> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  return request<TrendingResponse>("/search/trending");
}

export async function getCoin(id: string): Promise<CoinDetail> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 120, expire: 86400 });
  cacheTag(`coin:${id}`);
  return request<CoinDetail>(`/coins/${encodeURIComponent(id)}`, {
    localization: false,
    tickers: false,
    market_data: true,
    community_data: false,
    developer_data: false,
    sparkline: false,
  });
}

export async function getMarketChart(id: string, days: ChartRange): Promise<MarketChart> {
  "use cache";
  cacheLife({ stale: 60, revalidate: days === "1" ? 120 : 900, expire: 86400 });
  return request<MarketChart>(`/coins/${encodeURIComponent(id)}/market_chart`, {
    vs_currency: "usd",
    days,
  });
}

export async function searchCoins(query: string): Promise<SearchResponse> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  return request<SearchResponse>("/search", { query });
}
