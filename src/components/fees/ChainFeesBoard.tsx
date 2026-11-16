"use client";

import { useCallback, useState } from "react";
import { Group, Paper, SimpleGrid, Skeleton, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { useInterval } from "@mantine/hooks";
import { IconGasStation } from "@tabler/icons-react";
import { RelativeTime } from "@/components/common/RelativeTime";
import type { ChainFee, ChainFeesSnapshot, ChainId } from "@/lib/chain-fees-config";

const REFRESH_MS = 30_000;

const CHAIN_STYLE: Record<ChainId, { color: string; short: string }> = {
  bitcoin: { color: "orange", short: "BTC" },
  ethereum: { color: "indigo", short: "ETH" },
  arbitrum: { color: "blue", short: "ARB" },
  optimism: { color: "red", short: "OP" },
  base: { color: "cyan", short: "BASE" },
  solana: { color: "grape", short: "SOL" },
};

export function formatFeeValue(value: number, unit: ChainFee["unit"]) {
  if (unit === "lamports") return Math.round(value).toLocaleString("en-US");
  if (unit === "sat/vB") return value < 10 ? value.toFixed(value % 1 ? 1 : 0) : Math.round(value).toString();
  if (value === 0) return "0";
  if (value < 0.001) return value.toPrecision(2);
  if (value < 1) return value.toFixed(3);
  if (value < 10) return value.toFixed(2);
  return value.toFixed(1);
}

export function formatUsdFee(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value < 0.0001) return "<$0.0001";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

function ChainCard({ chain }: { chain: ChainFee }) {
  const style = CHAIN_STYLE[chain.id];
  return (
    <Paper withBorder p="sm" radius="md">
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap={6} wrap="nowrap">
          <ThemeIcon size={22} radius="xl" color={style.color} variant="light">
            <Text fz={8} fw={800}>
              {style.short}
            </Text>
          </ThemeIcon>
          <Text size="sm" fw={700}>
            {chain.name}
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          {chain.unit}
        </Text>
      </Group>
      <Tooltip label={chain.note ?? ""} multiline w={240} withArrow disabled={!chain.note}>
        <Text fz={22} fw={800} ff="monospace" mt={6} lh={1.1}>
          {formatFeeValue(chain.tiers.standard, chain.unit)}
        </Text>
      </Tooltip>
      <Group gap="sm" mt={2} wrap="nowrap">
        <Text size="xs" c="teal" ff="monospace">
          ↓ {formatFeeValue(chain.tiers.low, chain.unit)}
        </Text>
        <Text size="xs" c="orange" ff="monospace">
          ↑ {formatFeeValue(chain.tiers.fast, chain.unit)}
        </Text>
      </Group>
      <Text size="xs" c="dimmed" mt={6}>
        {chain.transferLabel}{" "}
        <Text span fw={700} c="var(--mantine-color-text)" ff="monospace">
          {formatUsdFee(chain.transferUsd?.standard)}
        </Text>
      </Text>
    </Paper>
  );
}

export function ChainFeesSkeleton() {
  return (
    <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="sm">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} h={118} radius="md" />
      ))}
    </SimpleGrid>
  );
}

export function ChainFeesBoard({ initial, title = true }: { initial: ChainFeesSnapshot; title?: boolean }) {
  const [snapshot, setSnapshot] = useState(initial);

  const refresh = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    fetch("/api/chain-fees")
      .then((res) => (res.ok ? (res.json() as Promise<ChainFeesSnapshot>) : Promise.reject(new Error(String(res.status)))))
      .then((next) => {
        if (next.chains.length) setSnapshot(next);
      })
      .catch(() => undefined);
  }, []);

  useInterval(refresh, REFRESH_MS, { autoInvoke: true });

  return (
    <Stack gap="sm" component="section" aria-label="Network fees">
      {title && (
        <Group justify="space-between" gap="xs">
          <Group gap="xs">
            <IconGasStation size={20} color="var(--mantine-color-brand-filled)" aria-hidden="true" />
            <Text fw={700} size="lg">
              Network fees
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            Standard fee, with ↓ low and ↑ fast · updated <RelativeTime iso={snapshot.updatedAt} />
          </Text>
        </Group>
      )}
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="sm">
        {snapshot.chains.map((chain) => (
          <ChainCard key={chain.id} chain={chain} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
