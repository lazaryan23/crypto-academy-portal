import { NextResponse, type NextRequest } from "next/server";
import { getMarketChart } from "@/lib/coingecko";
import { apiError } from "@/lib/api-response";
import type { ChartRange } from "@/types/coingecko";

const ranges: ChartRange[] = ["1", "7", "30", "90", "365"];

export async function GET(request: NextRequest, { params }: RouteContext<"/api/chart/[id]">) {
  const { id } = await params;
  const daysParam = request.nextUrl.searchParams.get("days") ?? "30";
  const days = ranges.includes(daysParam as ChartRange) ? (daysParam as ChartRange) : "30";
  try {
    const data = await getMarketChart(id, days);
    return NextResponse.json(data.prices, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    return apiError(error);
  }
}
