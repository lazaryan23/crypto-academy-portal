import { NextResponse } from "next/server";
import { getWhaleTransfers } from "@/lib/whale-transfers";

export async function GET() {
  const snapshot = await getWhaleTransfers();
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
