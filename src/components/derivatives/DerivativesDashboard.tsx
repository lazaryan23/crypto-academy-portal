"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Badge, Group, Paper, ProgressRoot, ProgressSection, SimpleGrid, Stack, Text } from "@mantine/core";
import { useInterval } from "@mantine/hooks";
import { RelativeTime } from "@/components/common/RelativeTime";
import type { DerivativesHistory, HistoryRange } from "@/lib/derivatives-history";
import type { DerivativesOverview, DerivativesRow } from "@/lib/derivatives-market";
import { funding8hToApr } from "@/lib/funding";
import { formatCompactUsd } from "@/lib/format";
import { FundingTable } from "./FundingTable";
import { HistoryPanel, type HistoryState } from "./HistoryPanel";
import { formatApr, formatFundingRate, fundingColor } from "./format";

const REFRESH_MS = 60_000;
const CROWDED_MIN_OI = 20_000_000;

function subscribeToNothing() {
  return () => undefined;
}

function readCoinParam() {
  return new URLSearchParams(window.location.search).get("coin")?.toUpperCase() ?? null;
}

function SummaryCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed" fw={600} mb={6}>
        {label}
      </Text>
      {children}
    </Paper>
  );
}

function Crowded({ row, side }: { row: DerivativesRow | undefined; side: "long" | "short" }) {
  if (!row || row.avgFunding8h === null) return null;
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <Text size="sm">
        <Text span c="dimmed" size="xs">
          {side === "long" ? "Longs pay most:" : "Shorts pay most:"}
        </Text>{" "}
        <Text span fw={700}>
          {row.symbol}
        </Text>
      </Text>
      <Text size="sm" ff="monospace" fw={700} c={fundingColor(row.avgFunding8h)}>
        {formatApr(funding8hToApr(row.avgFunding8h))}
      </Text>
    </Group>
  );
}

function Summary({ overview }: { overview: DerivativesOverview }) {
  const btc = overview.rows.find((row) => row.symbol === "BTC");
  const liquid = overview.rows.filter((row) => row.avgFunding8h !== null && (row.totalOiUsd ?? 0) >= CROWDED_MIN_OI);
  const byFunding = [...liquid].sort((a, b) => (b.avgFunding8h ?? 0) - (a.avgFunding8h ?? 0));
  const weighted = overview.weightedFunding8h;
  const btcShare = btc?.totalOiUsd && overview.totalOiUsd ? (btc.totalOiUsd / overview.totalOiUsd) * 100 : null;
  const ls = overview.btcLongShort;

  return (
    <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
      <SummaryCard label="Open interest tracked">
        <Text fz={24} fw={700} ff="monospace">
          {formatCompactUsd(overview.totalOiUsd)}
        </Text>
        <Text size="xs" c="dimmed">
          {overview.rows.length} coins across {overview.venuesOnline.length} exchanges{btcShare !== null ? ` · BTC is ${btcShare.toFixed(0)}%` : ""}
        </Text>
      </SummaryCard>
      <SummaryCard label="Average funding (8h)">
        <Text fz={24} fw={700} ff="monospace" c={fundingColor(weighted)}>
          {formatFundingRate(weighted)}
        </Text>
        <Text size="xs" c="dimmed">
          {weighted === null
            ? "Not available right now"
            : `${formatApr(funding8hToApr(weighted))} a year · ${weighted >= 0 ? "longs are paying shorts" : "shorts are paying longs"} overall`}
        </Text>
      </SummaryCard>
      <SummaryCard label="Most crowded trades">
        <Stack gap={6}>
          <Crowded row={byFunding[0]} side="long" />
          <Crowded row={byFunding[byFunding.length - 1]} side="short" />
          <Text size="xs" c="dimmed">
            Annualized, coins with $20M+ open interest
          </Text>
        </Stack>
      </SummaryCard>
      <SummaryCard label="BTC long / short accounts">
        {ls ? (
          <Stack gap={6}>
            <Group justify="space-between">
              <Text fw={700} ff="monospace" c="teal">
                {ls.longPct.toFixed(1)}% long
              </Text>
              <Text fw={700} ff="monospace" c="red">
                {ls.shortPct.toFixed(1)}% short
              </Text>
            </Group>
            <ProgressRoot size="md" radius="xl" aria-label="Share of Binance BTC accounts long versus short">
              <ProgressSection value={ls.longPct} color="teal" />
              <ProgressSection value={ls.shortPct} color="red" />
            </ProgressRoot>
            <Text size="xs" c="dimmed">
              Binance BTCUSDT accounts, last 5 minutes
            </Text>
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            Not available right now
          </Text>
        )}
      </SummaryCard>
    </SimpleGrid>
  );
}

export function DerivativesDashboard({ initial, initialHistory }: { initial: DerivativesOverview; initialHistory: DerivativesHistory | null }) {
  const [overview, setOverview] = useState(initial);
  const [picked, setPicked] = useState<string | null>(null);
  const [range, setRange] = useState<HistoryRange>("7d");
  const [histories, setHistories] = useState<Record<string, HistoryState>>(() =>
    initialHistory ? { [`${initialHistory.base}:7d`]: { status: "ok", data: initialHistory } } : {},
  );
  const requested = useRef(new Set(initialHistory ? [`${initialHistory.base}:7d`] : []));
  const panel = useRef<HTMLDivElement>(null);
  const urlCoin = useSyncExternalStore(subscribeToNothing, readCoinParam, () => null);

  const symbols = useMemo(() => new Set(overview.rows.map((row) => row.symbol)), [overview.rows]);
  const selected = picked ?? (urlCoin && symbols.has(urlCoin) ? urlCoin : "BTC");
  const selectedRow = overview.rows.find((row) => row.symbol === selected);
  const key = `${selected}:${range}`;
  const state: HistoryState = histories[key] ?? { status: "loading" };

  useEffect(() => {
    if (requested.current.has(key)) return;
    requested.current.add(key);
    fetch(`/api/derivatives/${encodeURIComponent(selected)}?range=${range}`)
      .then(async (res): Promise<HistoryState> => {
        if (res.ok) return { status: "ok", data: (await res.json()) as DerivativesHistory };
        return { status: res.status === 404 ? "unlisted" : "error" };
      })
      .catch((): HistoryState => ({ status: "error" }))
      .then((result) => {
        if (result.status === "error") requested.current.delete(key);
        setHistories((prev) => ({ ...prev, [key]: result }));
      });
  }, [key, selected, range]);

  const refresh = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    fetch("/api/derivatives")
      .then((res) => (res.ok ? (res.json() as Promise<DerivativesOverview>) : Promise.reject(new Error(String(res.status)))))
      .then((next) => {
        if (next.rows.length) setOverview(next);
      })
      .catch(() => undefined);
  }, []);

  useInterval(refresh, REFRESH_MS, { autoInvoke: true });

  const choose = useCallback((symbol: string, scroll: boolean) => {
    setPicked(symbol);
    const url = new URL(window.location.href);
    url.searchParams.set("coin", symbol.toLowerCase());
    window.history.replaceState(window.history.state, "", url);
    if (scroll) panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const options = useMemo(() => overview.rows.map((row) => ({ value: row.symbol, label: `${row.symbol} · ${row.name}` })), [overview.rows]);

  return (
    <Stack gap="xl">
      <Summary overview={overview} />

      <div ref={panel} style={{ scrollMarginTop: 80 }}>
        <HistoryPanel
          symbol={selected}
          name={selectedRow?.name ?? selected}
          range={range}
          state={state}
          options={options}
          onSymbolChange={(symbol) => choose(symbol, false)}
          onRangeChange={setRange}
        />
      </div>

      <Stack gap="sm">
        <Group justify="space-between" gap="xs">
          <Text fw={700} size="lg">
            Funding rates &amp; open interest by exchange
          </Text>
          <Group gap="xs">
            {overview.venuesOnline.length < 4 && (
              <Badge color="yellow" variant="light">
                {4 - overview.venuesOnline.length} exchange{overview.venuesOnline.length === 3 ? "" : "s"} temporarily unavailable
              </Badge>
            )}
            <Text size="xs" c="dimmed">
              Updated <RelativeTime iso={overview.updatedAt} /> · refreshes every minute
            </Text>
          </Group>
        </Group>
        <Text size="sm" c="dimmed">
          Positive funding means longs pay shorts; negative means shorts pay longs. Click a row to chart its history. Exchanges settle every 1, 4 or 8 hours, so the
          average converts every rate to an 8-hour equivalent.
        </Text>
        <FundingTable rows={overview.rows} selected={selected} onSelect={(symbol) => choose(symbol, true)} />
      </Stack>
    </Stack>
  );
}
