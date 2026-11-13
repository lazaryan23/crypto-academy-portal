"use client";

import { memo, useEffect, useRef } from "react";
import { Box, useComputedColorScheme } from "@mantine/core";

function TradingViewWidgetBase({ symbol }: { symbol: string }) {
  const container = useRef<HTMLDivElement>(null);
  const scheme = useComputedColorScheme("dark", { getInitialValueInEffect: true });

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    host.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "240",
      timezone: "Etc/UTC",
      theme: scheme,
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      hide_side_toolbar: false,
      support_host: "https://www.tradingview.com",
    });
    host.appendChild(script);
    return () => {
      host.innerHTML = "";
    };
  }, [symbol, scheme]);

  return (
    <Box style={{ height: "clamp(480px, 72vh, 680px)", width: "100%" }}>
      <Box ref={container} className="tradingview-widget-container" style={{ height: "100%", width: "100%" }} />
    </Box>
  );
}

export const TradingViewWidget = memo(TradingViewWidgetBase);
