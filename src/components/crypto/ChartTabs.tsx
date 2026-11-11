"use client";

import { Paper, Tabs, TabsList, TabsPanel, TabsTab } from "@mantine/core";
import { IconChartArea, IconChartCandle } from "@tabler/icons-react";
import { PriceChart } from "./PriceChart";
import { TradingViewWidget } from "./TradingViewWidget";

export function ChartTabs({ coinId, tradingViewSymbol }: { coinId: string; tradingViewSymbol: string }) {
  return (
    <Paper withBorder p={{ base: "sm", sm: "md" }}>
      <Tabs defaultValue="price" keepMounted={false}>
        <TabsList mb="md">
          <TabsTab value="price" leftSection={<IconChartArea size={16} />}>
            Price chart
          </TabsTab>
          <TabsTab value="tradingview" leftSection={<IconChartCandle size={16} />}>
            TradingView (advanced)
          </TabsTab>
        </TabsList>
        <TabsPanel value="price">
          <PriceChart coinId={coinId} />
        </TabsPanel>
        <TabsPanel value="tradingview">
          <TradingViewWidget symbol={tradingViewSymbol} />
        </TabsPanel>
      </Tabs>
    </Paper>
  );
}
