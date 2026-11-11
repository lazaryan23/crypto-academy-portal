import { NextResponse, type NextRequest } from "next/server";
import { getMarkets } from "@/lib/coingecko";
import { apiError } from "@/lib/api-response";
import type { MarketCategory } from "@/types/coingecko";

const categories: MarketCategory[] = ["top", "trending", "layer-1", "defi", "meme"];

export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get("category") ?? "top";
  const category = categories.includes(param as MarketCategory) ? (param as MarketCategory) : "top";
  try {
    const data = await getMarkets({ category });
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch (error) {
    return apiError(error);
  }
}
