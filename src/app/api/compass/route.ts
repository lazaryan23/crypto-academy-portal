import { NextResponse, connection } from "next/server";
import { getCompassSnapshot } from "@/lib/compass";

export async function GET() {
  await connection();
  const snapshot = await getCompassSnapshot();
  if (!snapshot) {
    return NextResponse.json({ error: "Buy pressure data is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } });
}
