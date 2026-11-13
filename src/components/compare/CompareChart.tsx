"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ColorType, LineSeries, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { Alert, Box, Group, LoadingOverlay, SegmentedControl, Stack, Text, useComputedColorScheme } from "@mantine/core";
import type { ChartPoint } from "@/types/coingecko";
import { formatPercent } from "@/lib/format";

export interface CompareSeries {
  id: string;
  name: string;
  symbol: string;
  color: string;
  points: ChartPoint[] | null;
}

const ranges = [
  { value: "30", label: "30D" },
  { value: "90", label: "90D" },
  { value: "180", label: "6M" },
  { value: "365", label: "1Y" },
];

const DAY_MS = 86_400_000;

function normalize(points: ChartPoint[], days: number) {
  const end = points[points.length - 1][0];
  const since = end - days * DAY_MS;
  const window = points.filter(([t]) => t >= since);
  const base = window[0]?.[1];
  if (!base) return [];
  const seen = new Set<number>();
  return window
    .map(([t, v]) => ({ time: Math.floor(t / 1000) as UTCTimestamp, value: ((v - base) / base) * 100 }))
    .filter((p) => (seen.has(p.time) ? false : (seen.add(p.time), true)));
}

export function CompareChart({ series }: { series: CompareSeries[] }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const lines = useRef<ISeriesApi<"Line">[]>([]);
  const scheme = useComputedColorScheme("dark", { getInitialValueInEffect: true });
  const [range, setRange] = useState("365");
  const [fetched, setFetched] = useState<Record<string, ChartPoint[] | null>>({});
  const [failed, setFailed] = useState(false);

  const missing = series.filter((s) => !s.points && !(s.id in fetched)).map((s) => s.id);
  const missingKey = missing.join(",");

  useEffect(() => {
    if (!missingKey) return;
    const controller = new AbortController();
    Promise.all(
      missingKey.split(",").map((id) =>
        fetch(`/api/chart/${encodeURIComponent(id)}?days=365`, { signal: controller.signal })
          .then((res) => (res.ok ? (res.json() as Promise<ChartPoint[]>) : null))
          .then((points) => [id, points] as const),
      ),
    )
      .then((entries) => {
        setFetched((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
        if (entries.some(([, points]) => !points)) setFailed(true);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [missingKey]);

  const resolved = useMemo(
    () => series.map((s) => ({ ...s, points: s.points ?? fetched[s.id] ?? null })),
    [series, fetched],
  );

  const normalized = useMemo(
    () => resolved.map((s) => ({ ...s, data: s.points?.length ? normalize(s.points, Number(range)) : [] })),
    [resolved, range],
  );

  useEffect(() => {
    if (!container.current) return;
    const instance = createChart(container.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, attributionLogo: true },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      localization: { priceFormatter: (value: number) => formatPercent(value) },
      handleScroll: { vertTouchDrag: false },
    });
    chart.current = instance;
    lines.current = series.map((s) =>
      instance.addSeries(LineSeries, { color: s.color, lineWidth: 2, priceLineVisible: false, title: s.symbol.toUpperCase() }),
    );
    return () => {
      instance.remove();
      chart.current = null;
      lines.current = [];
    };
  }, [series]);

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

  useEffect(() => {
    normalized.forEach((s, i) => lines.current[i]?.setData(s.data));
    chart.current?.timeScale().fitContent();
  }, [normalized]);

  const loading = resolved.some((s) => !s.points) && !failed;

  return (
    <Stack gap="sm">
      <Group justify="space-between" gap="sm">
        <Group gap="lg">
          {normalized.map((s) => {
            const last = s.data[s.data.length - 1]?.value ?? null;
            return (
              <Group key={s.id} gap={8} wrap="nowrap">
                <Box w={12} h={12} style={{ borderRadius: 3, background: s.color }} />
                <Text size="sm" fw={600}>
                  {s.name}
                </Text>
                <Text size="sm" fw={700} ff="monospace" c={last === null ? "dimmed" : last >= 0 ? "teal" : "red"}>
                  {formatPercent(last)}
                </Text>
              </Group>
            );
          })}
        </Group>
        <SegmentedControl size="xs" value={range} onChange={setRange} data={ranges} aria-label="Comparison range" />
      </Group>
      {failed && (
        <Alert color="red" variant="light">
          Some price history couldn&apos;t be loaded. Try again in a minute.
        </Alert>
      )}
      <Box pos="relative" h={{ base: 300, sm: 400 }}>
        <LoadingOverlay visible={loading} overlayProps={{ blur: 1, backgroundOpacity: 0.2 }} />
        <div ref={container} style={{ width: "100%", height: "100%" }} />
      </Box>
      <Text size="xs" c="dimmed">
        Percentage return from the start of the selected period, so coins with very different prices can be compared on one chart.
      </Text>
    </Stack>
  );
}
