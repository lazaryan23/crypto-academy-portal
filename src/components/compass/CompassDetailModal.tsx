"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Group,
  Modal,
  Progress,
  ProgressRoot,
  ProgressSection,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowRight, IconChartCandle, IconFlame } from "@tabler/icons-react";
import { describeIndex, type PressureReading } from "@/lib/buy-pressure";
import { formatCompactUsd, formatPercent } from "@/lib/format";
import { formatFundingRate } from "@/components/derivatives/format";
import { FLOW_EXCHANGES, useTakerFlow, type TakerFlow } from "./useTakerFlow";

interface DerivativesInfo {
  source: string;
  fundingRate: number;
  fundingIntervalHours: number;
  openInterestUsd: number | null;
  longPct: number | null;
  shortPct: number | null;
}

interface LiquidationInfo {
  tracked: boolean;
  windowStart: number;
  windowEnd: number;
  longUsd: number;
  shortUsd: number;
  count: number;
}

interface CoinContext {
  derivatives: DerivativesInfo | null;
  liquidations: LiquidationInfo | null;
}

function signedUsd(value: number) {
  return `${value >= 0 ? "+" : "−"}${formatCompactUsd(Math.abs(value))}`;
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} ff="monospace" c={color}>
        {value}
      </Text>
    </Stack>
  );
}

function useCoinContext(symbol: string | null) {
  const [state, setState] = useState<{ symbol: string | null; data: CoinContext | null; failed: boolean }>({
    symbol: null,
    data: null,
    failed: false,
  });

  useEffect(() => {
    if (!symbol) return;
    const controller = new AbortController();
    fetch(`/api/compass/${encodeURIComponent(symbol)}`, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<CoinContext>) : Promise.reject(new Error(String(res.status)))))
      .then((data) => setState({ symbol, data, failed: false }))
      .catch((err: Error) => {
        if (err.name !== "AbortError") setState({ symbol, data: null, failed: true });
      });
    return () => controller.abort();
  }, [symbol]);

  const current = state.symbol === symbol;
  return { loading: Boolean(symbol) && !current, data: current ? state.data : null, failed: current && state.failed };
}

function FlowTable({ flow }: { flow: TakerFlow }) {
  const totals = FLOW_EXCHANGES.reduce(
    (acc, exchange) => ({ buy: acc.buy + flow.exchanges[exchange].buyUsd, sell: acc.sell + flow.exchanges[exchange].sellUsd }),
    { buy: 0, sell: 0 },
  );
  return (
    <Table verticalSpacing={6} horizontalSpacing="xs" fz="sm">
      <TableThead>
        <TableTr>
          <TableTh>Exchange</TableTh>
          <TableTh ta="right">Taker buys</TableTh>
          <TableTh ta="right">Taker sells</TableTh>
          <TableTh ta="right">Net</TableTh>
        </TableTr>
      </TableThead>
      <TableTbody>
        {FLOW_EXCHANGES.map((exchange) => {
          const row = flow.exchanges[exchange];
          const net = row.buyUsd - row.sellUsd;
          return (
            <TableTr key={exchange}>
              <TableTd>
                <Group gap={6} wrap="nowrap">
                  <Text size="sm">{exchange}</Text>
                  {row.status !== "live" && (
                    <Badge size="xs" variant="light" color={row.status === "connecting" ? "yellow" : "gray"}>
                      {row.status === "connecting" ? "connecting" : "n/a"}
                    </Badge>
                  )}
                </Group>
              </TableTd>
              <TableTd ta="right" ff="monospace">
                {formatCompactUsd(row.buyUsd)}
              </TableTd>
              <TableTd ta="right" ff="monospace">
                {formatCompactUsd(row.sellUsd)}
              </TableTd>
              <TableTd ta="right" ff="monospace" c={net > 0 ? "teal" : net < 0 ? "red" : "dimmed"}>
                {signedUsd(net)}
              </TableTd>
            </TableTr>
          );
        })}
        <TableTr>
          <TableTd fw={700}>All</TableTd>
          <TableTd ta="right" ff="monospace" fw={700}>
            {formatCompactUsd(totals.buy)}
          </TableTd>
          <TableTd ta="right" ff="monospace" fw={700}>
            {formatCompactUsd(totals.sell)}
          </TableTd>
          <TableTd ta="right" ff="monospace" fw={700} c={totals.buy >= totals.sell ? "teal" : "red"}>
            {signedUsd(totals.buy - totals.sell)}
          </TableTd>
        </TableTr>
      </TableTbody>
    </Table>
  );
}

export function CompassDetailModal({
  reading,
  timeframeLabel,
  opened,
  onClose,
}: {
  reading: PressureReading | null;
  timeframeLabel: string;
  opened: boolean;
  onClose: () => void;
}) {
  const symbol = opened && reading ? reading.symbol : null;
  const context = useCoinContext(symbol);
  const flow = useTakerFlow({ base: reading?.symbol ?? "", contract: reading?.contract ?? "", enabled: opened && Boolean(reading) });

  if (!reading) return null;
  const mood = describeIndex(reading.index);
  const derivatives = context.data?.derivatives ?? null;
  const liquidations = context.data?.liquidations ?? null;
  const elapsed = flow.since && flow.updatedAt ? Math.max(1, Math.round((flow.updatedAt - flow.since) / 1000)) : 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      radius="lg"
      title={
        <Group gap="sm" wrap="nowrap">
          <Avatar src={reading.image || null} name={reading.symbol} color="initials" alt="" size="md" />
          <Stack gap={0}>
            <Title order={3} size="h4">
              {reading.name} buy pressure
            </Title>
            <Text size="xs" c="dimmed">
              {reading.contract} · Binance USDT-M · {timeframeLabel} window
            </Text>
          </Stack>
        </Group>
      }
    >
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <Stack gap={2}>
            <Text size="xs" c="dimmed">
              Buy Pressure Index
            </Text>
            <Group gap="xs" align="baseline">
              <Text fz={36} fw={800} ff="monospace" lh={1}>
                {Math.round(reading.index)}
              </Text>
              <Badge color={mood.color} variant="light">
                {mood.label}
              </Badge>
            </Group>
          </Stack>
          <Progress value={reading.index} w={{ base: "100%", xs: 200 }} color={mood.color} size="lg" radius="xl" aria-label="Buy Pressure Index" />
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <Stat label="Net taker buy" value={signedUsd(reading.netUsd)} color={reading.netUsd >= 0 ? "teal" : "red"} />
          <Stat label="Volume" value={formatCompactUsd(reading.volumeUsd)} />
          <Stat label="Volume vs 24h avg" value={reading.spike !== null ? `×${reading.spike.toFixed(2)}` : "—"} />
          <Stat label="Price change" value={formatPercent(reading.priceChange)} color={(reading.priceChange ?? 0) >= 0 ? "teal" : "red"} />
        </SimpleGrid>

        <Stack gap={4}>
          <Group justify="space-between">
            <Text size="xs" c="teal">
              Aggressive buys {(reading.buyShare * 100).toFixed(1)}%
            </Text>
            <Text size="xs" c="red">
              {((1 - reading.buyShare) * 100).toFixed(1)}% aggressive sells
            </Text>
          </Group>
          <ProgressRoot size="md" radius="xl" aria-label="Taker buy versus sell share">
            <ProgressSection value={reading.buyShare * 100} color="teal" />
            <ProgressSection value={(1 - reading.buyShare) * 100} color="red" />
          </ProgressRoot>
        </Stack>

        <Stack gap="xs">
          <Group justify="space-between">
            <Text fw={700}>Live taker flow across exchanges</Text>
            <Text size="xs" c="dimmed">
              {flow.since ? `last ${elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`}` : "connecting…"}
            </Text>
          </Group>
          <FlowTable flow={flow} />
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Stack gap="xs">
            <Group gap={6}>
              <IconChartCandle size={16} />
              <Text fw={700}>Derivatives</Text>
            </Group>
            {context.loading ? (
              <Skeleton height={60} radius="md" />
            ) : derivatives ? (
              <SimpleGrid cols={2} spacing="xs">
                <Stat
                  label={`Funding (${derivatives.fundingIntervalHours}h)`}
                  value={formatFundingRate(derivatives.fundingRate)}
                  color={derivatives.fundingRate >= 0 ? "teal" : "red"}
                />
                <Stat label="Open interest" value={formatCompactUsd(derivatives.openInterestUsd)} />
                <Stat label="Long accounts" value={derivatives.longPct !== null ? `${derivatives.longPct.toFixed(1)}%` : "—"} />
                <Stat label="Source" value={derivatives.source} />
              </SimpleGrid>
            ) : (
              <Text size="sm" c="dimmed">
                Derivatives data isn&apos;t available for this coin right now.
              </Text>
            )}
          </Stack>

          <Stack gap="xs">
            <Group gap={6}>
              <IconFlame size={16} />
              <Text fw={700}>Liquidations (OKX, last hour)</Text>
            </Group>
            {context.loading ? (
              <Skeleton height={60} radius="md" />
            ) : liquidations?.tracked ? (
              <SimpleGrid cols={2} spacing="xs">
                <Stat label="Longs liquidated" value={formatCompactUsd(liquidations.longUsd)} color="red" />
                <Stat label="Shorts liquidated" value={formatCompactUsd(liquidations.shortUsd)} color="teal" />
              </SimpleGrid>
            ) : (
              <Text size="sm" c="dimmed">
                {liquidations
                  ? "No OKX liquidations recorded for this coin in the last hour. History covers the 10 largest OKX contracts."
                  : "Liquidation history is unavailable right now."}
              </Text>
            )}
          </Stack>
        </SimpleGrid>

        {context.failed && (
          <Alert color="yellow" variant="light">
            Couldn&apos;t load derivatives context. Live flow above is unaffected.
          </Alert>
        )}

        <Group gap="sm">
          {reading.linked && (
            <Button component={Link} href={`/crypto/${reading.id}`} rightSection={<IconArrowRight size={16} />} onClick={onClose}>
              {reading.symbol} price & chart
            </Button>
          )}
          <Button component={Link} href={`/derivatives?coin=${reading.symbol.toLowerCase()}`} variant="default" onClick={onClose}>
            Funding & OI history
          </Button>
          <Button component={Link} href="/liquidations" variant="default" onClick={onClose}>
            Live liquidations
          </Button>
        </Group>

        <Text size="xs" c="dimmed">
          Buy pressure measures aggressive (taker) orders, not intentions or future price. Educational data only, not financial advice.
        </Text>
      </Stack>
    </Modal>
  );
}
