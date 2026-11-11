"use client";

import { useEffect, useRef, useState } from "react";
import { AreaSeries, ColorType, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { Alert, Box, Group, LoadingOverlay, SegmentedControl, Text, useComputedColorScheme } from "@mantine/core";
import type { ChartPoint, ChartRange } from "@/types/coingecko";
import { formatPercent, formatPrice } from "@/lib/format";

const ranges: { value: ChartRange; label: string }[] = [
  { value: "1", label: "24H" },
  { value: "7", label: "7D" },
  { value: "30", label: "1M" },
  { value: "90", label: "3M" },
  { value: "365", label: "1Y" },
];

export function PriceChart({ coinId }: { coinId: string }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Area"> | null>(null);
  const scheme = useComputedColorScheme("dark", { getInitialValueInEffect: true });
  const [range, setRange] = useState<ChartRange>("30");
  const key = `${coinId}:${range}`;
  const [result, setResult] = useState<{ key: string; points: ChartPoint[] | null; error: string | null }>({
    key: "",
    points: null,
    error: null,
  });
  const loading = result.key !== key;
  const points = result.points;
  const error = loading ? null : result.error;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/chart/${encodeURIComponent(coinId)}?days=${range}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Failed to load chart data.");
        setResult({ key, points: body as ChartPoint[], error: null });
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setResult((prev) => ({ key, points: prev.points, error: err.message }));
      });
    return () => controller.abort();
  }, [coinId, range, key]);

  useEffect(() => {
    if (!container.current) return;
    const instance = createChart(container.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, attributionLogo: true },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: { horzLine: { labelVisible: true } },
      handleScroll: { vertTouchDrag: false },
      localization: { priceFormatter: (price: number) => formatPrice(price) },
    });
    chart.current = instance;
    series.current = instance.addSeries(AreaSeries, { lineWidth: 2, priceLineVisible: false });
    return () => {
      instance.remove();
      chart.current = null;
      series.current = null;
    };
  }, []);

  useEffect(() => {
    const dark = scheme === "dark";
    chart.current?.applyOptions({
      layout: { textColor: dark ? "#a6a7ab" : "#495057" },
      grid: {
        vertLines: { color: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)" },
        horzLines: { color: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)" },
      },
    });
  }, [scheme]);

  const first = points?.[0]?.[1];
  const last = points?.[points.length - 1]?.[1];
  const change = first && last ? ((last - first) / first) * 100 : null;
  const up = (change ?? 0) >= 0;

  useEffect(() => {
    if (!series.current || !points) return;
    const seen = new Set<number>();
    const data = points
      .map(([t, v]) => ({ time: Math.floor(t / 1000) as UTCTimestamp, value: v }))
      .filter((p) => (seen.has(p.time) ? false : (seen.add(p.time), true)));
    const color = up ? "#12b886" : "#fa5252";
    series.current.applyOptions({
      lineColor: color,
      topColor: up ? "rgba(18,184,134,0.35)" : "rgba(250,82,82,0.35)",
      bottomColor: "rgba(0,0,0,0)",
    });
    series.current.setData(data);
    chart.current?.timeScale().fitContent();
  }, [points, up]);

  return (
    <Box>
      <Group justify="space-between" mb="sm" gap="sm">
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            {ranges.find((r) => r.value === range)?.label} change
          </Text>
          <Text size="sm" fw={700} c={change == null ? "dimmed" : up ? "teal" : "red"} ff="monospace">
            {formatPercent(change)}
          </Text>
        </Group>
        <SegmentedControl size="xs" value={range} onChange={(v) => setRange(v as ChartRange)} data={ranges} aria-label="Chart range" />
      </Group>
      {error && (
        <Alert color="red" variant="light" mb="sm">
          {error}
        </Alert>
      )}
      <Box pos="relative" h={{ base: 300, sm: 420 }}>
        <LoadingOverlay visible={loading} overlayProps={{ blur: 1, backgroundOpacity: 0.2 }} />
        <div ref={container} style={{ width: "100%", height: "100%" }} />
      </Box>
    </Box>
  );
}
