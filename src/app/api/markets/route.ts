import { NextResponse, type NextRequest } from "next/server";
import { getMarkets } from "@/lib/coingecko";
import { apiError } from "@/lib/api-response";
import { WATCHLIST_LIMIT } from "@/lib/watchlist-limits";
import type { MarketCategory } from "@/types/coingecko";

const categories: MarketCategory[] = ["top", "trending", "layer-1", "defi", "meme"];
const coinIdPattern = /^[a-z0-9-]{1,100}$/;

function parseIds(param: string | null): string[] | null {
  if (param === null) return null;
  const ids = [...new Set(param.split(",").map((id) => id.trim().toLowerCase()))].filter((id) => coinIdPattern.test(id));
  return ids.sort().slice(0, WATCHLIST_LIMIT);
}

export async function GET(request: NextRequest) {
  const ids = parseIds(request.nextUrl.searchParams.get("ids"));
  const param = request.nextUrl.searchParams.get("category") ?? "top";
  const category = categories.includes(param as MarketCategory) ? (param as MarketCategory) : "top";
  try {
    if (ids) {
      const data = ids.length ? await getMarkets({ ids, perPage: ids.length }) : [];
      return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
    }
    const data = await getMarkets({ category });
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch (error) {
    return apiError(error);
  }
}
