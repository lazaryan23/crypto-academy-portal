import { NextResponse } from "next/server";
import { getNetworkSnapshot } from "@/lib/network-snapshot";

export async function GET() {
  const snapshot = await getNetworkSnapshot();
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
