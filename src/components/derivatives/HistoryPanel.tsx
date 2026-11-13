"use client";

import { useEffect, useRef } from "react";
import {
  AreaSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineStyle,
  type UTCTimestamp,
} from "lightweight-charts";
import { Alert, Box, Group, LoadingOverlay, Paper, SegmentedControl, Select, SimpleGrid, Stack, Text, Title, useComputedColorScheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChartAreaLine } from "@tabler/icons-react";
import type { DerivativesHistory, HistoryPoint, HistoryRange } from "@/lib/derivatives-history";
import { changeColor, formatCompactUsd, formatPercent, formatPrice } from "@/lib/format";
import { fundingColor } from "./format";

export type HistoryState = { status: "ok"; data: DerivativesHistory } | { status: "unlisted" } | { status: "error" } | { status: "loading" };

const RANGES: { value: HistoryRange; label: string }[] = [
  { value: "1d", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
];

const COLORS = {
  oi: "#15aabf",
  priceDark: "#dee2e6",
  priceLight: "#343a40",
  long: "#12b886",
  top: "#7950f2",
  positive: "rgba(18, 184, 134, 0.85)",
  negative: "rgba(250, 82, 82, 0.85)",
};

type Series = {
  price: ISeriesApi<"Line">;
  oi: ISeriesApi<"Area">;
  funding: ISeriesApi<"Histogram">;
  longShare: ISeriesApi<"Line">;
  topTrader: ISeriesApi<"Line">;
};

function toData(points: HistoryPoint[]) {
  return points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }));
}

function last(points: HistoryPoint[] | null | undefined) {
  return points?.length ? points[points.length - 1].value : null;
}

function changeOver(points: HistoryPoint[]) {
  if (points.length < 2 || !points[0].value) return null;
  return ((points[points.length - 1].value - points[0].value) / points[0].value) * 100;
}

function Stat({ label, value, color, hint }: { label: string; value: string; color?: string; hint: string | null }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.4}>
        {label}
      </Text>
      <Text fz={18} fw={700} ff="monospace" c={color} style={{ whiteSpace: "nowrap" }}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Stack>
  );
}

function HistoryChart({ data }: { data: DerivativesHistory | null }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<Series | null>(null);
  const scheme = useComputedColorScheme("dark", { getInitialValueInEffect: true });
  const wide = useMediaQuery("(min-width: 48em)", true);

  useEffect(() => {
    if (!container.current) return;
    const instance = createChart(container.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, attributionLogo: true, panes: { separatorColor: "rgba(128,128,128,0.25)" } },
      rightPriceScale: { borderVisible: false },
      leftPriceScale: { visible: true, borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, lockVisibleTimeRangeOnResize: true },
      handleScroll: { vertTouchDrag: false, mouseWheel: false },
      handleScale: { mouseWheel: false },
    });
    const oi = instance.addSeries(AreaSeries, {
      priceScaleId: "left",
      lineColor: COLORS.oi,
      topColor: "rgba(21, 170, 191, 0.35)",
      bottomColor: "rgba(21, 170, 191, 0.02)",
      lineWidth: 2,
      priceLineVisible: false,
      title: "OI",
      priceFormat: { type: "custom", formatter: (value: number) => formatCompactUsd(value), minMove: 1 },
    });
    const price = instance.addSeries(LineSeries, {
      color: COLORS.priceDark,
      lineWidth: 2,
      priceLineVisible: false,
      title: "Price",
      priceFormat: { type: "custom", formatter: (value: number) => formatPrice(value), minMove: 0.00000001 },
    });
    const funding = instance.addSeries(
      HistogramSeries,
      {
        priceLineVisible: false,
        title: "Funding",
        priceFormat: { type: "custom", formatter: (value: number) => `${value.toFixed(4)}%`, minMove: 0.0001 },
      },
      1,
    );
    const longShare = instance.addSeries(
      LineSeries,
      {
        color: COLORS.long,
        lineWidth: 2,
        priceLineVisible: false,
        title: "Long accounts",
        priceFormat: { type: "custom", formatter: (value: number) => `${value.toFixed(1)}%`, minMove: 0.1 },
      },
      2,
    );
    const topTrader = instance.addSeries(
      LineSeries,
      {
        color: COLORS.top,
        lineWidth: 2,
        priceLineVisible: false,
        title: "Top traders",
        priceFormat: { type: "custom", formatter: (value: number) => `${value.toFixed(1)}%`, minMove: 0.1 },
      },
      2,
    );
    longShare.createPriceLine({ price: 50, color: "rgba(134,142,150,0.6)", lineWidth: 1, lineStyle: 2 as LineStyle, axisLabelVisible: false, title: "" });
    const panes = instance.panes();
    panes[0]?.setStretchFactor(3);
    panes[1]?.setStretchFactor(1.2);
    panes[2]?.setStretchFactor(1.4);
    chart.current = instance;
    series.current = { price, oi, funding, longShare, topTrader };
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
    series.current?.price.applyOptions({ color: dark ? COLORS.priceDark : COLORS.priceLight });
  }, [scheme]);

  useEffect(() => {
    chart.current?.applyOptions({ leftPriceScale: { visible: wide } });
  }, [wide]);

  useEffect(() => {
    const s = series.current;
    if (!s || !data) return;
    s.oi.setData(toData(data.openInterest));
    s.price.setData(toData(data.price));
    s.funding.setData(data.funding.map((p) => ({ time: p.time as UTCTimestamp, value: p.value, color: p.value >= 0 ? COLORS.positive : COLORS.negative })));
    s.longShare.setData(toData(data.longShare));
    s.topTrader.setData(toData(data.topTraderLongShare ?? []));
    chart.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={container} style={{ width: "100%", height: "100%" }} />;
}

export function HistoryPanel({
  symbol,
  name,
  range,
  state,
  options,
  onSymbolChange,
  onRangeChange,
}: {
  symbol: string;
  name: string;
  range: HistoryRange;
  state: HistoryState;
  options: { value: string; label: string }[];
  onSymbolChange: (symbol: string) => void;
  onRangeChange: (range: HistoryRange) => void;
}) {
  const data = state.status === "ok" ? state.data : null;
  const rangeLabel = RANGES.find((r) => r.value === range)?.label ?? range;
  const oiNow = last(data?.openInterest);
  const oiChange = data ? changeOver(data.openInterest) : null;
  const fundingNow = last(data?.funding);
  const fundingAvg = data?.funding.length ? data.funding.reduce((sum, p) => sum + p.value, 0) / data.funding.length : null;
  const longNow = last(data?.longShare);
  const takerNow = last(data?.takerBuySell);
  const topNow = last(data?.topTraderLongShare);

  return (
    <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md">
      <Stack gap="md">
        <Group justify="space-between" gap="sm" align="flex-end">
          <Stack gap={2}>
            <Group gap="xs">
              <IconChartAreaLine size={22} color="var(--mantine-color-cyan-5)" />
              <Title order={2} size="h3">
                {symbol} open interest &amp; funding history
              </Title>
            </Group>
            <Text size="sm" c="dimmed">
              {data ? `${name} · ${data.source} ${data.contract} perpetual` : name}
            </Text>
          </Stack>
          <Group gap="sm">
            <Select
              data={options}
              value={symbol}
              onChange={(value) => value && onSymbolChange(value)}
              searchable
              allowDeselect={false}
              w={200}
              aria-label="Choose a coin"
              onFocus={(event) => event.currentTarget.select()}
            />
            <SegmentedControl value={range} onChange={(value) => onRangeChange(value as HistoryRange)} data={RANGES} aria-label="History range" />
          </Group>
        </Group>

        {state.status === "unlisted" && (
          <Alert color="gray" variant="light">
            {symbol} doesn&apos;t have a USDT perpetual on Binance or Bybit, so there&apos;s no history to chart. Its current funding is still in the table above.
          </Alert>
        )}
        {state.status === "error" && (
          <Alert color="red" variant="light">
            History for {symbol} couldn&apos;t be loaded just now. Switch the range or coin to try again.
          </Alert>
        )}

        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          <Stat
            label="Open interest"
            value={formatCompactUsd(oiNow)}
            color={undefined}
            hint={oiChange === null ? null : `${formatPercent(oiChange)} over ${rangeLabel}`}
          />
          <Stat
            label="Last funding"
            value={fundingNow === null ? "—" : `${fundingNow > 0 ? "+" : ""}${fundingNow.toFixed(4)}%`}
            color={fundingColor(fundingNow)}
            hint={fundingAvg === null ? null : `${fundingAvg > 0 ? "+" : ""}${fundingAvg.toFixed(4)}% average over ${rangeLabel}`}
          />
          <Stat
            label="Long accounts"
            value={longNow === null ? "—" : `${longNow.toFixed(1)}%`}
            color={longNow === null ? undefined : longNow >= 50 ? "teal" : "red"}
            hint={topNow === null ? null : `Top traders: ${topNow.toFixed(1)}% long by position`}
          />
          <Stat
            label="Taker buy / sell"
            value={takerNow === null ? "—" : takerNow.toFixed(2)}
            color={takerNow === null ? undefined : changeColor(takerNow - 1)}
            hint={takerNow === null ? "Not available on this exchange" : takerNow >= 1 ? "Market buyers more aggressive" : "Market sellers more aggressive"}
          />
        </SimpleGrid>

        <Box pos="relative" h={{ base: 460, sm: 560 }}>
          <LoadingOverlay visible={state.status === "loading"} overlayProps={{ blur: 1, backgroundOpacity: 0.2 }} />
          <HistoryChart data={data} />
        </Box>

        <Group gap="lg">
          {[
            { color: COLORS.oi, label: "Open interest" },
            { color: "var(--mantine-color-text)", label: "Price" },
            { color: COLORS.positive, label: "Funding per settlement" },
            { color: COLORS.long, label: "Share of accounts long" },
            ...(data?.topTraderLongShare ? [{ color: COLORS.top, label: "Top traders long (by position)" }] : []),
          ].map((item) => (
            <Group key={item.label} gap={6} wrap="nowrap">
              <Box w={10} h={10} style={{ borderRadius: 2, background: item.color }} />
              <Text size="xs" c="dimmed">
                {item.label}
              </Text>
            </Group>
          ))}
        </Group>
      </Stack>
    </Paper>
  );
}
