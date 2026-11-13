"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AreaSeries,
  ColorType,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineType,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  Alert,
  Box,
  Button,
  Group,
  LoadingOverlay,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
  useComputedColorScheme,
} from "@mantine/core";
import { IconCheck, IconCopy, IconLink } from "@tabler/icons-react";
import type { ChartPoint } from "@/types/coingecko";
import { runDca, type Frequency } from "@/lib/dca";
import { formatDate, formatPercent, formatPrice, formatUsd } from "@/lib/format";

export interface DcaCoinOption {
  value: string;
  label: string;
  name: string;
  symbol: string;
}

const periods = [
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "1 year" },
];

const steppedLine = 1 as LineType;

function readParams(params: URLSearchParams, options: DcaCoinOption[]) {
  const coin = params.get("coin");
  const amount = Number(params.get("amount"));
  const freq = params.get("freq");
  const period = params.get("period");
  return {
    coin: coin && options.some((o) => o.value === coin) ? coin : "bitcoin",
    amount: Number.isFinite(amount) && amount >= 1 && amount <= 1_000_000 ? amount : 100,
    frequency: (freq === "monthly" ? "monthly" : "weekly") as Frequency,
    months: periods.some((p) => p.value === period) ? Number(period) : 12,
  };
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  }
}

function Stat({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" fw={600}>
        {label}
      </Text>
      <Text fz={20} fw={700} ff="monospace" c={color}>
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

export function DcaTool({ options, initialPoints }: { options: DcaCoinOption[]; initialPoints: ChartPoint[] | null }) {
  const searchParams = useSearchParams();
  const initial = useMemo(() => readParams(new URLSearchParams(searchParams.toString()), options), [searchParams, options]);
  const [coin, setCoin] = useState(initial.coin);
  const [amount, setAmount] = useState(initial.amount);
  const [frequency, setFrequency] = useState<Frequency>(initial.frequency);
  const [months, setMonths] = useState(initial.months);
  const [history, setHistory] = useState<Record<string, ChartPoint[] | null>>(() => {
    const seeded: Record<string, ChartPoint[] | null> = {};
    if (initialPoints) seeded.bitcoin = initialPoints;
    return seeded;
  });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"link" | "summary" | null>(null);

  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const valueSeries = useRef<ISeriesApi<"Area"> | null>(null);
  const investedSeries = useRef<ISeriesApi<"Line"> | null>(null);
  const scheme = useComputedColorScheme("dark", { getInitialValueInEffect: true });

  const points = history[coin];
  const loading = points === undefined;
  const selected = options.find((o) => o.value === coin);

  useEffect(() => {
    if (history[coin] !== undefined) return;
    const controller = new AbortController();
    fetch(`/api/chart/${encodeURIComponent(coin)}?days=365`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Couldn't load price history.");
        setHistory((prev) => ({ ...prev, [coin]: body as ChartPoint[] }));
        setError(null);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setHistory((prev) => ({ ...prev, [coin]: null }));
        setError(err.message);
      });
    return () => controller.abort();
  }, [coin, history]);

  useEffect(() => {
    const params = new URLSearchParams({ coin, amount: String(amount), freq: frequency, period: String(months) });
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [coin, amount, frequency, months]);

  const result = useMemo(() => (points ? runDca(points, amount, frequency, months) : null), [points, amount, frequency, months]);

  useEffect(() => {
    if (!container.current) return;
    const instance = createChart(container.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, attributionLogo: true },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      localization: { priceFormatter: (value: number) => formatUsd(value) },
      handleScroll: { vertTouchDrag: false },
    });
    chart.current = instance;
    valueSeries.current = instance.addSeries(AreaSeries, {
      lineColor: "#22b8cf",
      topColor: "rgba(34,184,207,0.35)",
      bottomColor: "rgba(34,184,207,0)",
      lineWidth: 2,
      priceLineVisible: false,
      title: "Value",
    });
    investedSeries.current = instance.addSeries(LineSeries, {
      color: "#adb5bd",
      lineWidth: 2,
      lineType: steppedLine,
      priceLineVisible: false,
      title: "Invested",
    });
    return () => {
      instance.remove();
      chart.current = null;
      valueSeries.current = null;
      investedSeries.current = null;
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

  useEffect(() => {
    if (!result) return;
    const seen = new Set<number>();
    const rows = result.series
      .map((p) => ({ ...p, time: Math.floor(p.time / 1000) as UTCTimestamp }))
      .filter((p) => (seen.has(p.time) ? false : (seen.add(p.time), true)));
    valueSeries.current?.setData(rows.map((p) => ({ time: p.time, value: p.value })));
    investedSeries.current?.setData(rows.map((p) => ({ time: p.time, value: p.invested })));
    chart.current?.timeScale().fitContent();
  }, [result]);

  const periodLabel = periods.find((p) => p.value === String(months))?.label ?? `${months} months`;
  const name = selected?.name ?? coin;
  const ticker = selected?.symbol.toUpperCase() ?? "";

  const copy = async (kind: "link" | "summary") => {
    const url = window.location.href;
    const text =
      kind === "link" || !result
        ? url
        : `I backtested buying ${formatUsd(amount)} of ${name} ${frequency === "weekly" ? "every week" : "every month"} for ${periodLabel} on CoinCompass: ${formatUsd(result.invested)} invested → ${formatUsd(result.value)} today (${formatPercent(result.roi)}). ${url}`;
    if (await copyText(text)) {
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <Stack gap="lg">
      <Paper withBorder p={{ base: "md", sm: "lg" }}>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
          <Select label="Coin" data={options} value={coin} onChange={(v) => v && setCoin(v)} allowDeselect={false} searchable />
          <NumberInput
            label="Amount each time (USD)"
            value={amount}
            onChange={(v) => setAmount(Math.min(1_000_000, Math.max(1, Number(v) || 1)))}
            min={1}
            max={1_000_000}
            thousandSeparator=","
            prefix="$"
          />
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              How often
            </Text>
            <SegmentedControl
              fullWidth
              value={frequency}
              onChange={(v) => setFrequency(v as Frequency)}
              data={[
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
              ]}
            />
          </Stack>
          <Select label="Over the last" data={periods} value={String(months)} onChange={(v) => v && setMonths(Number(v))} allowDeselect={false} />
        </SimpleGrid>
      </Paper>

      {error && (
        <Alert color="red" variant="light">
          {error} Try another coin or come back in a minute.
        </Alert>
      )}

      <Paper withBorder p={{ base: "md", sm: "lg" }}>
        <Stack gap="lg">
          {result ? (
            <>
              <Stack gap={4}>
                <Title order={2} size="h3">
                  {formatUsd(result.invested)} became{" "}
                  <Text span inherit c={result.profit >= 0 ? "teal" : "red"}>
                    {formatUsd(result.value)}
                  </Text>
                </Title>
                <Text c="dimmed" size="sm">
                  Buying {formatUsd(amount)} of {name} {frequency === "weekly" ? "every week" : "every month"} since {formatDate(new Date(result.startTime).toISOString())} ({result.buys} buys).
                </Text>
              </Stack>
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
                <Stat label="Profit / loss" value={`${result.profit >= 0 ? "+" : "-"}${formatUsd(Math.abs(result.profit))}`} hint={formatPercent(result.roi)} color={result.profit >= 0 ? "teal" : "red"} />
                <Stat label={`${ticker} accumulated`} value={result.units.toPrecision(5)} hint={`${result.buys} purchases`} />
                <Stat label="Average buy price" value={formatPrice(result.averageCost)} hint={`Price today ${formatPrice(result.lastPrice)}`} />
                <Stat
                  label="Lump sum instead"
                  value={formatUsd(result.lumpSumValue)}
                  hint={`${formatPercent(result.lumpSumRoi)} if all invested on day one`}
                />
              </SimpleGrid>
            </>
          ) : (
            !loading && <Text c="dimmed">Not enough price history for this period.</Text>
          )}

          <Box pos="relative" h={{ base: 260, sm: 340 }}>
            <LoadingOverlay visible={loading} overlayProps={{ blur: 1, backgroundOpacity: 0.2 }} />
            <div ref={container} style={{ width: "100%", height: "100%" }} />
          </Box>
          <Group gap={20}>
            <Group gap={6}>
              <Box w={12} h={3} bg="#22b8cf" />
              <Text size="xs" c="dimmed">
                Portfolio value
              </Text>
            </Group>
            <Group gap={6}>
              <Box w={12} h={3} bg="#adb5bd" />
              <Text size="xs" c="dimmed">
                Total invested
              </Text>
            </Group>
          </Group>

          {result && (
            <Group gap="sm">
              <Button variant="light" leftSection={copied === "summary" ? <IconCheck size={16} /> : <IconCopy size={16} />} onClick={() => copy("summary")}>
                {copied === "summary" ? "Copied" : "Copy result"}
              </Button>
              <Button variant="default" leftSection={copied === "link" ? <IconCheck size={16} /> : <IconLink size={16} />} onClick={() => copy("link")}>
                {copied === "link" ? "Copied" : "Copy link"}
              </Button>
            </Group>
          )}
        </Stack>
      </Paper>
      <Text size="xs" c="dimmed">
        Uses daily closing prices from CoinGecko and ignores fees and slippage. Past performance doesn&apos;t predict future returns.
      </Text>
    </Stack>
  );
}
