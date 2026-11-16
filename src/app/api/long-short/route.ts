import { NextResponse, type NextRequest } from "next/server";
import { getLongShort, isLongShortCoin, isLongShortTimeframe } from "@/lib/long-short";

export async function GET(request: NextRequest) {
  const coin = request.nextUrl.searchParams.get("coin")?.toUpperCase() ?? "BTC";
  const tf = request.nextUrl.searchParams.get("tf") ?? "1h";
  if (!isLongShortCoin(coin) || !isLongShortTimeframe(tf)) {
    return NextResponse.json({ error: "Unsupported coin or timeframe." }, { status: 400 });
  }
  const snapshot = await getLongShort(coin, tf);
  if (!snapshot.exchanges.length) {
    return NextResponse.json({ error: "Long/short data is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
}
