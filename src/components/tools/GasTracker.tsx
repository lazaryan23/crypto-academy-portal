"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Alert, Badge, Card, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { useInterval } from "@mantine/hooks";
import { IconCurrencyBitcoin, IconCurrencyEthereum } from "@tabler/icons-react";
import { RelativeTime } from "@/components/common/RelativeTime";
import type { NetworkSnapshot } from "@/lib/network-snapshot";

const REFRESH_MS = 60_000;
const BTC_TX_VBYTES = 140;
const ETH_TRANSFER_GAS = 21_000;
const ETH_SWAP_GAS = 150_000;

export function formatFeeUsd(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value < 0.0001) return "<$0.0001";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatGwei(value: number | null) {
  if (value === null) return "—";
  const digits = value < 1 ? 3 : value < 10 ? 2 : 1;
  return `${value.toFixed(digits)} Gwei`;
}

function congestion(level: number, thresholds: [number, number]) {
  if (level < thresholds[0]) return { label: "Low fees", color: "teal" };
  if (level < thresholds[1]) return { label: "Moderate fees", color: "yellow" };
  return { label: "High fees", color: "red" };
}

function Tier({ label, hint, value, costs }: { label: string; hint: string; value: string; costs: { label: string; value: string }[] }) {
  return (
    <Card withBorder padding="sm" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text size="xs" c="dimmed">
        {hint}
      </Text>
      <Text fz={18} fw={700} ff="monospace" mt={6} style={{ whiteSpace: "nowrap" }}>
        {value}
      </Text>
      <Stack gap={2} mt={6}>
        {costs.map((cost) => (
          <Group key={cost.label} justify="space-between" gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
              {cost.label}
            </Text>
            <Text size="sm" ff="monospace" fw={600}>
              {cost.value}
            </Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

function NetworkCard({
  icon,
  color,
  title,
  badge,
  children,
}: {
  icon: ReactNode;
  color: string;
  title: string;
  badge: { label: string; color: string } | null;
  children: ReactNode;
}) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Group justify="space-between" mb="md" gap="xs">
        <Group gap="sm">
          <ThemeIcon variant="light" color={color} size={36} radius="md">
            {icon}
          </ThemeIcon>
          <Title order={2} size="h4">
            {title}
          </Title>
        </Group>
        {badge && (
          <Badge variant="light" color={badge.color}>
            {badge.label}
          </Badge>
        )}
      </Group>
      {children}
    </Card>
  );
}

export function GasTracker({ initial }: { initial: NetworkSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    fetch("/api/network-fees")
      .then((res) => (res.ok ? (res.json() as Promise<NetworkSnapshot>) : Promise.reject(new Error(String(res.status)))))
      .then((next) => {
        setSnapshot((prev) => ({
          bitcoin: next.bitcoin ?? prev.bitcoin,
          ethereum: next.ethereum ?? prev.ethereum,
          btcPrice: next.btcPrice ?? prev.btcPrice,
          ethPrice: next.ethPrice ?? prev.ethPrice,
        }));
        setUpdatedAt(new Date().toISOString());
      })
      .catch(() => undefined);
  }, []);

  useInterval(refresh, REFRESH_MS, { autoInvoke: true });

  const { bitcoin, ethereum, btcPrice, ethPrice } = snapshot;
  const btcCost = (satPerVb: number) => (btcPrice === null ? null : ((satPerVb * BTC_TX_VBYTES) / 1e8) * btcPrice);
  const ethCost = (gwei: number | null, gas: number) => (gwei === null || ethPrice === null ? null : gwei * gas * 1e-9 * ethPrice);

  const ethTiers: { label: string; hint: string; gwei: number | null }[] = ethereum
    ? [
        { label: "Low", hint: "may take a few minutes", gwei: ethereum.low },
        { label: "Standard", hint: "next block or two", gwei: ethereum.standard },
        { label: "Fast", hint: "next block", gwei: ethereum.fast },
      ].filter((tier) => tier.gwei !== null)
    : [];

  return (
    <Stack gap="sm">
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <NetworkCard
          icon={<IconCurrencyBitcoin size={22} />}
          color="orange"
          title="Bitcoin network fees"
          badge={bitcoin ? congestion(bitcoin.fastest, [10, 50]) : null}
        >
          {bitcoin ? (
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
                <Tier label="Fastest" hint="~10 minutes" value={`${bitcoin.fastest} sat/vB`} costs={[{ label: "Typical tx", value: formatFeeUsd(btcCost(bitcoin.fastest)) }]} />
                <Tier label="Half hour" hint="~30 minutes" value={`${bitcoin.halfHour} sat/vB`} costs={[{ label: "Typical tx", value: formatFeeUsd(btcCost(bitcoin.halfHour)) }]} />
                <Tier label="Hour" hint="~60 minutes" value={`${bitcoin.hour} sat/vB`} costs={[{ label: "Typical tx", value: formatFeeUsd(btcCost(bitcoin.hour)) }]} />
              </SimpleGrid>
              <Text size="xs" c="dimmed">
                Cost for a typical {BTC_TX_VBYTES} vByte transaction (one input, two outputs). Fee rates from mempool.space.
              </Text>
            </Stack>
          ) : (
            <Alert color="gray" variant="light">
              Bitcoin fee data from mempool.space is temporarily unavailable. We&apos;ll retry automatically.
            </Alert>
          )}
        </NetworkCard>

        <NetworkCard
          icon={<IconCurrencyEthereum size={22} />}
          color="indigo"
          title="Ethereum gas"
          badge={ethereum ? congestion(ethereum.standard, [5, 30]) : null}
        >
          {ethereum ? (
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, xs: ethTiers.length }} spacing="sm">
                {ethTiers.map((tier) => (
                  <Tier
                    key={tier.label}
                    label={tier.label}
                    hint={tier.hint}
                    value={formatGwei(tier.gwei)}
                    costs={[
                      { label: "ETH transfer", value: formatFeeUsd(ethCost(tier.gwei, ETH_TRANSFER_GAS)) },
                      { label: "Token swap", value: formatFeeUsd(ethCost(tier.gwei, ETH_SWAP_GAS)) },
                    ]}
                  />
                ))}
              </SimpleGrid>
              <Text size="xs" c="dimmed">
                {ethereum.baseFee !== null ? `Base fee ${formatGwei(ethereum.baseFee)}. ` : ""}
                Transfer = {ETH_TRANSFER_GAS.toLocaleString("en-US")} gas, swap ≈ {ETH_SWAP_GAS.toLocaleString("en-US")} gas. Live data via the{" "}
                {ethereum.source} public Ethereum RPC.
              </Text>
            </Stack>
          ) : (
            <Alert color="gray" variant="light">
              Ethereum gas data from public RPCs is temporarily unavailable. We&apos;ll retry automatically.
            </Alert>
          )}
        </NetworkCard>
      </SimpleGrid>
      <Text size="xs" c="dimmed" ta="right">
        {updatedAt ? (
          <>
            Updated <RelativeTime iso={updatedAt} /> ·{" "}
          </>
        ) : null}
        Refreshes every minute. USD costs use live BTC and ETH prices.
      </Text>
    </Stack>
  );
}
