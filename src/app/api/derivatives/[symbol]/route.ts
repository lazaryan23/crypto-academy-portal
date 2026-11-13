import { NextResponse, type NextRequest } from "next/server";
import { getDerivativesHistory, isHistoryRange } from "@/lib/derivatives-history";

export async function GET(request: NextRequest, { params }: RouteContext<"/api/derivatives/[symbol]">) {
  const { symbol } = await params;
  const rangeParam = request.nextUrl.searchParams.get("range");
  const outcome = await getDerivativesHistory(symbol, isHistoryRange(rangeParam) ? rangeParam : "7d");
  if (outcome.status === "ok") {
    return NextResponse.json(outcome.data, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
  }
  const status = outcome.status === "unlisted" ? 404 : 503;
  return NextResponse.json({ error: outcome.status }, { status, headers: { "Cache-Control": "public, s-maxage=20" } });
}
