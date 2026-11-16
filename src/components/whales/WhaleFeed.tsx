"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Anchor, Avatar, Badge, Group, Paper, SegmentedControl, Select, Stack, Text } from "@mantine/core";
import { useInterval } from "@mantine/hooks";
import { IconArrowRight, IconExternalLink } from "@tabler/icons-react";
import { RelativeTime } from "@/components/common/RelativeTime";
import { formatCompactUsd } from "@/lib/format";
import {
  explorerUrl,
  TRANSFER_TYPE_LABELS,
  WHALE_TOKENS,
  type TransferType,
  type WhaleSnapshot,
  type WhaleToken,
  type WhaleTransfer,
} from "@/lib/whale-config";

const REFRESH_MS = 45_000;
const MAX_ITEMS = 200;
const PAGE = 40;

const TOKEN_IMAGES: Record<WhaleToken, string> = {
  BTC: "https://coin-images.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png",
  USDT: "https://coin-images.coingecko.com/coins/images/325/small/Tether.png",
  USDC: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png",
};

const TYPE_COLORS: Record<TransferType, string> = { inflow: "red", outflow: "teal", exchange: "violet", wallet: "gray" };

const MIN_OPTIONS = [
  { value: "1000000", label: "$1M+" },
  { value: "5000000", label: "$5M+" },
  { value: "10000000", label: "$10M+" },
];

function shortAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

function Party({ exchange, address }: { exchange: string | null; address: string }) {
  return exchange ? (
    <Badge variant="light" color="yellow" size="sm">
      {exchange}
    </Badge>
  ) : (
    <Text size="xs" ff="monospace" c="dimmed">
      {shortAddress(address)}
    </Text>
  );
}

function formatAmount(amount: number, token: WhaleToken) {
  const digits = token === "BTC" || token === "ETH" ? (amount >= 1000 ? 0 : 2) : 0;
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: digits })} ${token}`;
}

function Row({ transfer, fresh }: { transfer: WhaleTransfer; fresh: boolean }) {
  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      style={{
        borderColor: fresh ? "var(--mantine-color-brand-filled)" : undefined,
        transition: "border-color 1.5s ease-out",
      }}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <Avatar src={TOKEN_IMAGES[transfer.token]} size={32} alt="" />
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Group gap={6} wrap="wrap">
              <Text fw={800} ff="monospace">
                {formatCompactUsd(transfer.usd)}
              </Text>
              <Text size="sm" c="dimmed" ff="monospace">
                {formatAmount(transfer.amount, transfer.token)}
              </Text>
              <Badge size="xs" variant="light" color={TYPE_COLORS[transfer.type]}>
                {TRANSFER_TYPE_LABELS[transfer.type]}
              </Badge>
            </Group>
            <Group gap={6} wrap="nowrap">
              <Party exchange={transfer.from.exchange} address={transfer.from.address} />
              <IconArrowRight size={12} color="var(--mantine-color-dimmed)" />
              <Party exchange={transfer.to.exchange} address={transfer.to.address} />
            </Group>
          </Stack>
        </Group>
        <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
          <Text size="xs" c="dimmed">
            <RelativeTime iso={new Date(transfer.timestamp).toISOString()} />
          </Text>
          <Anchor href={explorerUrl(transfer)} target="_blank" rel="noopener noreferrer" size="xs" aria-label="View transaction on block explorer">
            <Group gap={2} wrap="nowrap">
              {transfer.chain === "bitcoin" ? "mempool" : "Etherscan"}
              <IconExternalLink size={12} />
            </Group>
          </Anchor>
        </Stack>
      </Group>
    </Paper>
  );
}

function merge(current: WhaleTransfer[], incoming: WhaleTransfer[]) {
  const byId = new Map(current.map((transfer) => [transfer.id, transfer]));
  for (const transfer of incoming) byId.set(transfer.id, transfer);
  return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp || b.usd - a.usd).slice(0, MAX_ITEMS);
}

export function WhaleFeed({ initial }: { initial: WhaleSnapshot }) {
  const [transfers, setTransfers] = useState(initial.transfers);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [updatedAt, setUpdatedAt] = useState(initial.updatedAt);
  const [token, setToken] = useState<"all" | WhaleToken>("all");
  const [type, setType] = useState<"all" | TransferType>("all");
  const [exchange, setExchange] = useState<string | null>(null);
  const [minUsd, setMinUsd] = useState("1000000");
  const [limit, setLimit] = useState(PAGE);
  const transfersRef = useRef(transfers);

  useEffect(() => {
    transfersRef.current = transfers;
  }, [transfers]);

  const refresh = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    fetch("/api/whales")
      .then((res) => (res.ok ? (res.json() as Promise<WhaleSnapshot>) : Promise.reject(new Error(String(res.status)))))
      .then((next) => {
        const known = new Set(transfersRef.current.map((transfer) => transfer.id));
        setFreshIds(new Set(next.transfers.filter((transfer) => !known.has(transfer.id)).map((transfer) => transfer.id)));
        setTransfers((current) => merge(current, next.transfers));
        setUpdatedAt(next.updatedAt);
      })
      .catch(() => undefined);
  }, []);

  useInterval(refresh, REFRESH_MS, { autoInvoke: true });

  const exchanges = useMemo(
    () => [...new Set(transfers.flatMap((transfer) => [transfer.from.exchange, transfer.to.exchange]).filter((name): name is string => Boolean(name)))].sort(),
    [transfers],
  );

  const visible = useMemo(
    () =>
      transfers.filter(
        (transfer) =>
          (token === "all" || transfer.token === token) &&
          (type === "all" || transfer.type === type) &&
          (!exchange || transfer.from.exchange === exchange || transfer.to.exchange === exchange) &&
          transfer.usd >= Number(minUsd),
      ),
    [transfers, token, type, exchange, minUsd],
  );

  const totals = useMemo(() => {
    const inflow = visible.filter((t) => t.type === "inflow").reduce((sum, t) => sum + t.usd, 0);
    const outflow = visible.filter((t) => t.type === "outflow").reduce((sum, t) => sum + t.usd, 0);
    return { inflow, outflow, all: visible.reduce((sum, t) => sum + t.usd, 0) };
  }, [visible]);

  return (
    <Stack gap="md">
      <Group justify="space-between" gap="sm">
        <Group gap="xs" wrap="wrap">
          <SegmentedControl
            size="xs"
            value={token}
            onChange={(value) => setToken(value as "all" | WhaleToken)}
            data={[{ value: "all", label: "All" }, ...WHALE_TOKENS.map((t) => ({ value: t, label: t }))]}
            aria-label="Token"
          />
          <SegmentedControl size="xs" value={minUsd} onChange={setMinUsd} data={MIN_OPTIONS} aria-label="Minimum size" />
        </Group>
        <Group gap="xs" wrap="wrap">
          <Select
            size="xs"
            w={190}
            value={type}
            onChange={(value) => setType((value as "all" | TransferType) ?? "all")}
            data={[{ value: "all", label: "All transfer types" }, ...Object.entries(TRANSFER_TYPE_LABELS).map(([value, label]) => ({ value, label }))]}
            allowDeselect={false}
            aria-label="Transfer type"
          />
          <Select
            size="xs"
            w={160}
            placeholder="Any exchange"
            value={exchange}
            onChange={setExchange}
            data={exchanges}
            clearable
            disabled={!exchanges.length}
            aria-label="Exchange"
          />
        </Group>
      </Group>

      <Group gap="lg">
        <Text size="sm">
          <Text span c="dimmed">
            Shown:
          </Text>{" "}
          <Text span fw={700} ff="monospace">
            {visible.length} · {formatCompactUsd(totals.all)}
          </Text>
        </Text>
        <Text size="sm">
          <Text span c="dimmed">
            Into exchanges:
          </Text>{" "}
          <Text span fw={700} ff="monospace" c="red">
            {formatCompactUsd(totals.inflow)}
          </Text>
        </Text>
        <Text size="sm">
          <Text span c="dimmed">
            Out of exchanges:
          </Text>{" "}
          <Text span fw={700} ff="monospace" c="teal">
            {formatCompactUsd(totals.outflow)}
          </Text>
        </Text>
        <Text size="xs" c="dimmed">
          Updated <RelativeTime iso={updatedAt} /> · refreshes every 45s
        </Text>
      </Group>

      <Stack gap="xs" aria-live="polite">
        {visible.slice(0, limit).map((transfer) => (
          <Row key={transfer.id} transfer={transfer} fresh={freshIds.has(transfer.id)} />
        ))}
        {!visible.length && (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            No transfers match these filters yet. New blocks are scanned every 45 seconds.
          </Text>
        )}
      </Stack>
      {visible.length > limit && (
        <Anchor component="button" size="sm" onClick={() => setLimit((n) => n + PAGE)} style={{ alignSelf: "center" }}>
          Show more
        </Anchor>
      )}
    </Stack>
  );
}
