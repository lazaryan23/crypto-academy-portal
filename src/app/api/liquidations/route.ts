import { NextResponse } from "next/server";
import { getRecentLiquidations } from "@/lib/liquidations";

export async function GET() {
  const recent = await getRecentLiquidations();
  if (!recent) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "public, s-maxage=20" } });
  return NextResponse.json(recent, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
}
