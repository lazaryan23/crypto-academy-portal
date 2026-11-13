import { NextResponse } from "next/server";
import { getLeverageMap, isMapCoin } from "@/lib/leverage-map";

export async function GET(_request: Request, { params }: RouteContext<"/api/liquidations/map/[symbol]">) {
  const { symbol } = await params;
  const base = symbol.toUpperCase();
  if (!isMapCoin(base)) return NextResponse.json({ error: "unsupported" }, { status: 404 });
  const map = await getLeverageMap(base);
  if (!map) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "public, s-maxage=20" } });
  return NextResponse.json(map, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
}
