import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getCryptoCalendar } from "@/lib/crypto-calendar";

export async function GET() {
  await connection();
  const snapshot = await getCryptoCalendar();
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } });
}
