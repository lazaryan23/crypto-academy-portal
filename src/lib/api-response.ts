import { NextResponse } from "next/server";
import { getErrorStatus } from "@/lib/coingecko";

export function apiError(error: unknown) {
  const upstream = getErrorStatus(error);
  const status = upstream === 429 ? 429 : upstream === 404 ? 404 : upstream ? 502 : 500;
  const message =
    status === 429
      ? "Rate limited by the market data provider. Retrying shortly."
      : status === 404
        ? "Coin not found."
        : "Failed to load market data.";
  if (status === 500) console.error(error);
  return NextResponse.json({ error: message }, { status });
}
