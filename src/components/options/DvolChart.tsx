"use client";

import { useEffect, useRef } from "react";
import { AreaSeries, ColorType, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { useComputedColorScheme } from "@mantine/core";

export function DvolChart({ history }: { history: [number, number][] }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Area"> | null>(null);
  const scheme = useComputedColorScheme("dark", { getInitialValueInEffect: true });

  useEffect(() => {
    if (!container.current) return;
    const instance = createChart(container.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, attributionLogo: true },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, lockVisibleTimeRangeOnResize: true },
      handleScroll: { vertTouchDrag: false, mouseWheel: false },
      handleScale: { mouseWheel: false },
    });
    series.current = instance.addSeries(AreaSeries, {
      lineColor: "#be4bdb",
      topColor: "rgba(190, 75, 219, 0.3)",
      bottomColor: "rgba(190, 75, 219, 0.02)",
      lineWidth: 2,
      priceLineVisible: false,
      priceFormat: { type: "custom", formatter: (value: number) => value.toFixed(1), minMove: 0.1 },
    });
    chart.current = instance;
    return () => {
      instance.remove();
      chart.current = null;
      series.current = null;
    };
  }, []);

  useEffect(() => {
    const dark = scheme === "dark";
    const grid = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";
    chart.current?.applyOptions({
      layout: { textColor: dark ? "#a6a7ab" : "#495057" },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
    });
  }, [scheme]);

  useEffect(() => {
    series.current?.setData(history.map(([time, value]) => ({ time: Math.floor(time / 1000) as UTCTimestamp, value })));
    chart.current?.timeScale().fitContent();
  }, [history]);

  return <div ref={container} style={{ width: "100%", height: "100%" }} />;
}
