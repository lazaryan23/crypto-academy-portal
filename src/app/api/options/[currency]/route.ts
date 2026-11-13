import { NextResponse } from "next/server";
import { getOptionsOverview } from "@/lib/options";
import { isOptionCurrency } from "@/lib/options-math";

export async function GET(_request: Request, { params }: RouteContext<"/api/options/[currency]">) {
  const { currency } = await params;
  const code = currency.toUpperCase();
  if (!isOptionCurrency(code)) return NextResponse.json({ error: "unsupported" }, { status: 404 });
  const overview = await getOptionsOverview(code);
  if (!overview) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "public, s-maxage=20" } });
  return NextResponse.json(overview, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
}
