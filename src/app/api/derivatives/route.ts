import { NextResponse } from "next/server";
import { getDerivativesOverview } from "@/lib/derivatives-market";

export async function GET() {
  const overview = await getDerivativesOverview();
  return NextResponse.json(overview, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
