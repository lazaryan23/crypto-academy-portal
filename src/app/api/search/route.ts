import { NextResponse, type NextRequest } from "next/server";
import { searchCoins } from "@/lib/coingecko";
import { apiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 50) ?? "";
  if (query.length < 2) return NextResponse.json({ coins: [] });
  try {
    const data = await searchCoins(query.toLowerCase());
    return NextResponse.json({ coins: data.coins.slice(0, 8) });
  } catch (error) {
    return apiError(error);
  }
}
