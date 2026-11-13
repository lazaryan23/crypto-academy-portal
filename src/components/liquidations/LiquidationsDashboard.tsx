"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Grid,
  GridCol,
  Group,
  LoadingOverlay,
  Paper,
  ProgressRoot,
  ProgressSection,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useInterval } from "@mantine/hooks";
import { IconActivityHeartbeat, IconChartBar } from "@tabler/icons-react";
import { RelativeTime } from "@/components/common/RelativeTime";
import type { LeverageMap } from "@/lib/leverage-map";
import { LIQUIDATION_EXCHANGES, type LiquidationEvent, type LiquidationTally } from "@/lib/liquidation-feed";
import type { LiquidationSetup, RecentLiquidations } from "@/lib/liquidations";
import { formatCompactUsd, formatPrice } from "@/lib/format";
import { LeverageMapChart } from "./LeverageMapChart";
import { LiquidationFeed } from "./LiquidationFeed";
import { useLiquidationFeed, type FeedStatus } from "./useLiquidationFeed";

const MAP_COINS = ["BTC", "ETH", "SOL", "XRP", "DOGE"];
const RECENT_REFRESH_MS = 120_000;
const STATUS_COLOR: Record<FeedStatus, string> = { live: "teal", connecting: "yellow", paused: "gray", offline: "red" };
const STATUS_LABEL: Record<FeedStatus, string> = { live: "Live", connecting: "Connecting", paused: "Paused while tab is hidden", offline: "Reconnecting" };

type MapState = { status: "ok"; data: LeverageMap } | { status: "error" } | { status: "loading" };

function share(tally: LiquidationTally) {
  const total = tally.longUsd + tally.shortUsd;
  return total > 0 ? (tally.longUsd / total) * 100 : 50;
}

function StatCard({ label, value, color, children }: { label: string; value: string; color?: string; children?: React.ReactNode }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.4} mb={6}>
        {label}
      </Text>
      <Text fz={24} fw={700} ff="monospace" c={color}>
        {value}
      </Text>
      {children}
    </Paper>
  );
}

function SideBar({ tally, label }: { tally: LiquidationTally; label: string }) {
  const longShare = share(tally);
  return (
    <ProgressRoot size="md" radius="xl" aria-label={label}>
      <ProgressSection value={longShare} color="red" />
      <ProgressSection value={100 - longShare} color="teal" />
    </ProgressRoot>
  );
}

function RecentSummary({ recent }: { recent: RecentLiquidations }) {
  const minutes = Math.max(1, Math.round((recent.windowEnd - recent.windowStart) / 60_000));
  const total = recent.totals.longUsd + recent.totals.shortUsd;
  const window = minutes >= 59 ? "last hour" : `last ${minutes} min`;
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
      <StatCard label={`Liquidated in the ${window}`} value={formatCompactUsd(total)}>
        <Stack gap={6} mt={6}>
          <SideBar tally={recent.totals} label="Long versus short liquidations" />
          <Text size="xs" c="dimmed">
            {recent.totals.count.toLocaleString("en-US")} orders · top 10 coins on OKX
          </Text>
        </Stack>
      </StatCard>
      <StatCard label="Longs liquidated" value={formatCompactUsd(recent.totals.longUsd)} color="red">
        <Text size="xs" c="dimmed">
          {share(recent.totals).toFixed(0)}% of the total · forced sells as price dropped
        </Text>
      </StatCard>
      <StatCard label="Shorts liquidated" value={formatCompactUsd(recent.totals.shortUsd)} color="teal">
        <Text size="xs" c="dimmed">
          {(100 - share(recent.totals)).toFixed(0)}% of the total · forced buys as price rose
        </Text>
      </StatCard>
      <StatCard label="Largest single liquidation" value={recent.largest ? formatCompactUsd(recent.largest.usd) : "—"} color={recent.largest?.side === "long" ? "red" : "teal"}>
        {recent.largest && (
          <Text size="xs" c="dimmed">
            {recent.largest.base} {recent.largest.side} at {formatPrice(recent.largest.price)} · <RelativeTime iso={new Date(recent.largest.time).toISOString()} />
          </Text>
        )}
      </StatCard>
    </SimpleGrid>
  );
}

function CoinBars({ coins }: { coins: { base: string; longUsd: number; shortUsd: number }[] }) {
  const max = Math.max(1, ...coins.map((coin) => coin.longUsd + coin.shortUsd));
  return (
    <Stack gap={8}>
      {coins.map((coin) => {
        const total = coin.longUsd + coin.shortUsd;
        return (
          <Tooltip key={coin.base} label={`Longs ${formatCompactUsd(coin.longUsd)} · Shorts ${formatCompactUsd(coin.shortUsd)}`} withArrow>
            <Box>
              <Group justify="space-between" gap="xs" mb={2}>
                <Text size="sm" fw={600}>
                  {coin.base}
                </Text>
                <Text size="sm" ff="monospace">
                  {formatCompactUsd(total)}
                </Text>
              </Group>
              <Box w={`${Math.max(4, (total / max) * 100)}%`}>
                <ProgressRoot size="sm" radius="xl">
                  <ProgressSection value={(coin.longUsd / total) * 100} color="red" />
                  <ProgressSection value={(coin.shortUsd / total) * 100} color="teal" />
                </ProgressRoot>
              </Box>
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  );
}

function levelWithin(map: LeverageMap, pct: number, side: "long" | "short") {
  return map.buckets.reduce((sum, bucket) => {
    const distance = (bucket.price - map.price) / map.price;
    if (side === "long" && distance < 0 && distance >= -pct) return sum + bucket.longUsd;
    if (side === "short" && distance > 0 && distance <= pct) return sum + bucket.shortUsd;
    return sum;
  }, 0);
}

function LeverageZones({ initial }: { initial: LeverageMap | null }) {
  const [coin, setCoin] = useState("BTC");
  const [maps, setMaps] = useState<Record<string, MapState>>(() => (initial ? { [initial.base]: { status: "ok", data: initial } } : {}));
  const state: MapState = maps[coin] ?? { status: "loading" };

  useEffect(() => {
    if (maps[coin]) return;
    let active = true;
    fetch(`/api/liquidations/map/${coin.toLowerCase()}`)
      .then(async (res): Promise<MapState> => (res.ok ? { status: "ok", data: (await res.json()) as LeverageMap } : { status: "error" }))
      .catch((): MapState => ({ status: "error" }))
      .then((result) => {
        if (active) setMaps((prev) => ({ ...prev, [coin]: result }));
      });
    return () => {
      active = false;
    };
  }, [coin, maps]);

  const data = state.status === "ok" ? state.data : null;

  return (
    <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-end" gap="sm">
          <Stack gap={2}>
            <Group gap="xs">
              <IconChartBar size={22} color="var(--mantine-color-orange-6)" />
              <Title order={2} size="h3">
                Estimated liquidation levels
              </Title>
              <Badge variant="light" color="orange">
                Model
              </Badge>
            </Group>
            <Text size="sm" c="dimmed" maw={680}>
              Where leveraged positions opened over the last 7 days would be force-closed, assuming a typical mix of 10×, 25×, 50× and 100× leverage. Tall bars are price
              levels that could trigger a cascade if reached.
            </Text>
          </Stack>
          <SegmentedControl value={coin} onChange={setCoin} data={MAP_COINS} aria-label="Coin" />
        </Group>

        {data && (
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
            <Text size="sm">
              <Text span c="red" fw={700} ff="monospace">
                {formatCompactUsd(levelWithin(data, 0.05, "long"))}
              </Text>{" "}
              of longs at risk if {coin} falls 5% to {formatPrice(data.price * 0.95)}
            </Text>
            <Text size="sm">
              <Text span c="teal" fw={700} ff="monospace">
                {formatCompactUsd(levelWithin(data, 0.05, "short"))}
              </Text>{" "}
              of shorts at risk if {coin} rises 5% to {formatPrice(data.price * 1.05)}
            </Text>
          </SimpleGrid>
        )}

        {state.status === "error" ? (
          <Alert color="gray" variant="light">
            Liquidation levels for {coin} couldn&apos;t be calculated just now. Try another coin or check back in a minute.
          </Alert>
        ) : (
          <Box pos="relative" mih={380}>
            <LoadingOverlay visible={state.status === "loading"} overlayProps={{ blur: 1, backgroundOpacity: 0.2 }} />
            {data && <LeverageMapChart map={data} />}
          </Box>
        )}

        <Text size="xs" c="dimmed">
          An estimate, not exchange data: built from Binance {coin}USDT hourly open interest and price. New open interest each hour is split evenly between longs and
          shorts across the leverage mix; positions are dropped once price trades through their liquidation level, and shrink when open interest falls. Real positions
          use many leverage levels and stop-losses, so treat these as zones, not exact prices.
        </Text>
      </Stack>
    </Paper>
  );
}

export function LiquidationsDashboard({
  setup,
  initialRecent,
  initialMap,
}: {
  setup: LiquidationSetup;
  initialRecent: RecentLiquidations | null;
  initialMap: LeverageMap | null;
}) {
  const feed = useLiquidationFeed({ okxContractValues: setup.okxContractValues, bybitSymbols: setup.bybitSymbols });
  const [recent, setRecent] = useState(initialRecent);

  const refresh = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    fetch("/api/liquidations")
      .then((res) => (res.ok ? (res.json() as Promise<RecentLiquidations>) : Promise.reject(new Error(String(res.status)))))
      .then(setRecent)
      .catch(() => undefined);
  }, []);

  useInterval(refresh, RECENT_REFRESH_MS, { autoInvoke: true });

  const events = useMemo(() => {
    const seen = new Set<string>();
    const merged: LiquidationEvent[] = [];
    for (const item of [...feed.events, ...(recent?.events ?? [])]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
    return merged.sort((a, b) => b.time - a.time);
  }, [feed.events, recent]);

  const coinOptions = useMemo(() => [...new Set([...setup.trackedBases.slice(0, 40), ...events.map((item) => item.base)])].sort(), [setup.trackedBases, events]);

  const sessionCoins = useMemo(
    () =>
      Object.entries(feed.byCoin)
        .map(([base, tally]) => ({ base, ...tally }))
        .sort((a, b) => b.longUsd + b.shortUsd - (a.longUsd + a.shortUsd))
        .slice(0, 8),
    [feed.byCoin],
  );

  return (
    <Stack gap="xl">
      {recent ? (
        <RecentSummary recent={recent} />
      ) : (
        <Alert color="gray" variant="light">
          Recent liquidation history from OKX is temporarily unavailable. The live feed below still works.
        </Alert>
      )}

      <Grid gap="lg">
        <GridCol span={{ base: 12, lg: 8 }}>
          <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md" h="100%">
            <Group justify="space-between" gap="sm" mb="xs">
              <Group gap="xs">
                <IconActivityHeartbeat size={22} color="var(--mantine-color-red-6)" />
                <Title order={2} size="h3">
                  Live liquidations
                </Title>
              </Group>
              <Group gap={6}>
                {LIQUIDATION_EXCHANGES.map((exchange) => (
                  <Tooltip key={exchange} label={STATUS_LABEL[feed.status[exchange]]} withArrow>
                    <Badge variant="dot" color={STATUS_COLOR[feed.status[exchange]]} size="sm">
                      {exchange}
                    </Badge>
                  </Tooltip>
                ))}
              </Group>
            </Group>
            <Text size="sm" c="dimmed" mb="sm">
              Forced closes streaming from Binance, Bybit and OKX as they happen. A long liquidation is a forced sell; a short liquidation is a forced buy.
            </Text>
            <LiquidationFeed events={events} coins={coinOptions} />
          </Paper>
        </GridCol>
        <GridCol span={{ base: 12, lg: 4 }}>
          <Stack gap="lg" h="100%">
            <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.4} mb={6}>
                Since you opened this page
              </Text>
              <Group justify="space-between" mb={6}>
                <Text fw={700} ff="monospace" c="red">
                  {formatCompactUsd(feed.session.longUsd)} longs
                </Text>
                <Text fw={700} ff="monospace" c="teal">
                  {formatCompactUsd(feed.session.shortUsd)} shorts
                </Text>
              </Group>
              <SideBar tally={feed.session} label="Long versus short liquidations since the page opened" />
              <Text size="xs" c="dimmed" mt={6}>
                {feed.session.count.toLocaleString("en-US")} liquidations
                {feed.largest ? ` · largest ${formatCompactUsd(feed.largest.usd)} ${feed.largest.base} ${feed.largest.side}` : ""}
                {feed.startedAt ? (
                  <>
                    {" "}
                    · started <RelativeTime iso={new Date(feed.startedAt).toISOString()} />
                  </>
                ) : null}
              </Text>
              {sessionCoins.length > 0 && (
                <Box mt="md">
                  <CoinBars coins={sessionCoins} />
                </Box>
              )}
            </Paper>
            {recent && recent.coins.length > 0 && (
              <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md" style={{ flex: 1 }}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.4} mb="sm">
                  Most liquidated · last hour on OKX
                </Text>
                <CoinBars coins={recent.coins.slice(0, 8)} />
              </Paper>
            )}
          </Stack>
        </GridCol>
      </Grid>

      <LeverageZones initial={initialMap} />
    </Stack>
  );
}
