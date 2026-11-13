"use client";

import { useState } from "react";
import type { ChartPoint } from "@/types/coingecko";
import { ChartTabs, type ChartTab } from "./ChartTabs";
import { TradePlanner, useTradePlan } from "./TradePlanner";

export function CoinTradeWorkspace({
  coinId,
  coinName,
  symbol,
  price,
  tradingViewSymbol,
  initialPoints,
}: {
  coinId: string;
  coinName: string;
  symbol: string;
  price: number | undefined;
  tradingViewSymbol: string;
  initialPoints: ChartPoint[] | null;
}) {
  const [tab, setTab] = useState<ChartTab>("price");
  const plan = useTradePlan(price ?? 0);

  return (
    <>
      <ChartTabs
        coinId={coinId}
        tradingViewSymbol={tradingViewSymbol}
        initialPoints={initialPoints}
        levels={plan.chartLevels}
        tab={tab}
        onTabChange={setTab}
      />
      {price ? <TradePlanner coinName={coinName} symbol={symbol} state={plan} onInteract={() => setTab("price")} /> : null}
    </>
  );
}
