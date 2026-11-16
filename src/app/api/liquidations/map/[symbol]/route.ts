import { NextResponse } from "next/server";
import { getLeverageMap, isMapCoin, isMapRange } from "@/lib/leverage-map";

export async function GET(request: Request, { params }: RouteContext<"/api/liquidations/map/[symbol]">) {
  const { symbol } = await params;
  const base = symbol.toUpperCase();
  if (!isMapCoin(base)) return NextResponse.json({ error: "unsupported" }, { status: 404 });
  const rangeParam = new URL(request.url).searchParams.get("range") ?? "7d";
  const range = isMapRange(rangeParam) ? rangeParam : "7d";
  const map = await getLeverageMap(base, range);
  if (!map) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "public, s-maxage=20" } });
  return NextResponse.json(map, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
}
