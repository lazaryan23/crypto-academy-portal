import { NextResponse } from "next/server";
import { getChainFees } from "@/lib/chain-fees";

export async function GET() {
  const snapshot = await getChainFees();
  if (!snapshot.chains.length) {
    return NextResponse.json({ error: "Network fees are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" } });
}
