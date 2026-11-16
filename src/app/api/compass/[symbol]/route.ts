import { NextResponse, connection } from "next/server";
import { getDerivatives } from "@/lib/derivatives";
import { getRecentLiquidations } from "@/lib/liquidations";
import { derivativesBase } from "@/lib/derivatives-market";

export async function GET(_request: Request, { params }: RouteContext<"/api/compass/[symbol]">) {
  await connection();
  const { symbol } = await params;
  const base = derivativesBase(symbol);
  if (!base || base.length > 20) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });

  const [derivatives, recent] = await Promise.all([getDerivatives(base), getRecentLiquidations().catch(() => null)]);
  const coin = recent?.coins.find((c) => c.base === base) ?? null;

  return NextResponse.json(
    {
      derivatives: derivatives.status === "ok" ? derivatives.data : null,
      liquidations: recent
        ? {
            tracked: coin !== null,
            windowStart: recent.windowStart,
            windowEnd: recent.windowEnd,
            longUsd: coin?.longUsd ?? 0,
            shortUsd: coin?.shortUsd ?? 0,
            count: coin?.count ?? 0,
          }
        : null,
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
