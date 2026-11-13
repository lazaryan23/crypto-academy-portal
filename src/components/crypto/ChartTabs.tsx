"use client";

import { Paper, Tabs, TabsList, TabsPanel, TabsTab } from "@mantine/core";
import { IconChartArea, IconChartCandle } from "@tabler/icons-react";
import { PriceChart, type ChartLevel } from "./PriceChart";
import { TradingViewWidget } from "./TradingViewWidget";
import type { ChartPoint } from "@/types/coingecko";

export type ChartTab = "price" | "tradingview";

export function ChartTabs({
  coinId,
  tradingViewSymbol,
  initialPoints,
  levels,
  tab,
  onTabChange,
}: {
  coinId: string;
  tradingViewSymbol: string;
  initialPoints: ChartPoint[] | null;
  levels?: ChartLevel[];
  tab: ChartTab;
  onTabChange: (tab: ChartTab) => void;
}) {
  return (
    <Paper withBorder p={{ base: "sm", sm: "md" }}>
      <Tabs value={tab} onChange={(value) => value && onTabChange(value as ChartTab)} keepMounted={false}>
        <TabsList mb="md">
          <TabsTab value="price" leftSection={<IconChartArea size={16} />}>
            Price chart
          </TabsTab>
          <TabsTab value="tradingview" leftSection={<IconChartCandle size={16} />}>
            TradingView (advanced)
          </TabsTab>
        </TabsList>
        <TabsPanel value="price">
          <PriceChart coinId={coinId} initialPoints={initialPoints} levels={levels} />
        </TabsPanel>
        <TabsPanel value="tradingview">
          <TradingViewWidget symbol={tradingViewSymbol} />
        </TabsPanel>
      </Tabs>
    </Paper>
  );
}
