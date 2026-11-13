import { NextResponse, connection } from "next/server";
import { getLiquidationSetup } from "@/lib/liquidations";

export async function GET() {
  await connection();
  const setup = await getLiquidationSetup();
  const complete = Object.keys(setup.bybitSymbols).length > 0 && Object.keys(setup.okxContractValues).length > 0;
  return NextResponse.json(setup, { headers: { "Cache-Control": complete ? "public, s-maxage=300, stale-while-revalidate=600" : "no-store" } });
}
