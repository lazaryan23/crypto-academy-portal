"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Avatar,
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconArrowDownRight, IconArrowUpRight, IconChevronDown, IconChevronUp, IconSelector } from "@tabler/icons-react";
import type { DerivativesRow } from "@/lib/derivatives-market";
import { changeColor, formatCompactUsd, formatPercent, formatPrice } from "@/lib/format";
import { classifySignal, OI_DEADBAND, PRICE_DEADBAND, SIGNAL_ORDER, SIGNALS, signalStrength, type SignalType } from "@/lib/market-signals";

type SortKey = "strength" | "volume" | "oiChange" | "change24h";

const PAGE = 20;

const quadrantLayout: Exclude<SignalType, "neutral">[] = ["shorts-entering", "longs-entering", "longs-closing", "shorts-closing"];

interface ScreenedRow {
  row: DerivativesRow;
  signal: SignalType;
  strength: number;
}

function sortValue(item: ScreenedRow, key: SortKey) {
  switch (key) {
    case "volume":
      return item.row.volume24h;
    case "oiChange":
      return item.row.oiChange24h;
    case "change24h":
      return item.row.change24h;
    default:
      return item.strength;
  }
}

function Arrow({ dir }: { dir: "up" | "down" | null }) {
  if (!dir) return null;
  const Icon = dir === "up" ? IconArrowUpRight : IconArrowDownRight;
  return <Icon size={14} color={`var(--mantine-color-${dir === "up" ? "teal" : "red"}-5)`} aria-hidden="true" />;
}

function Quadrant({ type, items, active, onToggle }: { type: Exclude<SignalType, "neutral">; items: ScreenedRow[]; active: boolean; onToggle: () => void }) {
  const info = SIGNALS[type];
  const leaders = [...items].sort((a, b) => b.strength - a.strength).slice(0, 4);
  return (
    <UnstyledButton
      onClick={onToggle}
      aria-pressed={active}
      p="md"
      style={{
        borderRadius: "var(--mantine-radius-md)",
        border: `1px solid ${active ? `var(--mantine-color-${info.color}-6)` : "var(--mantine-color-default-border)"}`,
        background: active ? `var(--mantine-color-${info.color}-light)` : undefined,
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={2}>
          <Group gap={4} wrap="nowrap">
            <Text size="xs" c="dimmed">
              Price
            </Text>
            <Arrow dir={info.price} />
            <Text size="xs" c="dimmed" ml={4}>
              OI
            </Text>
            <Arrow dir={info.oi} />
          </Group>
          <Text fw={700}>{info.label}</Text>
          <Text size="xs" c={info.color}>
            {info.bias}
          </Text>
        </Stack>
        <Text fz={28} fw={800} ff="monospace" lh={1}>
          {items.length}
        </Text>
      </Group>
      <Group gap={6} mt="sm" mih={22}>
        {leaders.map(({ row }) => (
          <Badge key={row.symbol} variant="default" size="sm" leftSection={<Avatar src={row.image} size={14} alt="" />}>
            {row.symbol}
          </Badge>
        ))}
      </Group>
    </UnstyledButton>
  );
}

function SortTh({
  label,
  sortKey,
  sort,
  onSort,
  desktopOnly,
}: {
  label: ReactNode;
  sortKey: SortKey;
  sort: { key: SortKey; desc: boolean };
  onSort: (key: SortKey) => void;
  desktopOnly?: boolean;
}) {
  const active = sort.key === sortKey;
  const Icon = active ? (sort.desc ? IconChevronDown : IconChevronUp) : IconSelector;
  return (
    <TableTh ta="right" visibleFrom={desktopOnly ? "sm" : undefined} aria-sort={active ? (sort.desc ? "descending" : "ascending") : undefined}>
      <UnstyledButton onClick={() => onSort(sortKey)} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Text size="xs" fw={700} c={active ? undefined : "dimmed"} style={{ whiteSpace: "nowrap" }}>
          {label}
        </Text>
        <Icon size={14} style={{ opacity: active ? 1 : 0.5 }} />
      </UnstyledButton>
    </TableTh>
  );
}

export function SignalScreener({ rows, onSelect }: { rows: DerivativesRow[]; onSelect: (symbol: string) => void }) {
  const [filter, setFilter] = useState<SignalType | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "strength", desc: true });
  const [limit, setLimit] = useState(PAGE);

  const screened = useMemo<ScreenedRow[]>(
    () =>
      rows
        .filter((row) => row.oiChange24h !== null && row.change24h !== null)
        .map((row) => ({ row, signal: classifySignal(row.change24h, row.oiChange24h), strength: signalStrength(row.change24h, row.oiChange24h) })),
    [rows],
  );

  const bySignal = useMemo(() => {
    const groups = Object.fromEntries([...SIGNAL_ORDER, "neutral"].map((type) => [type, [] as ScreenedRow[]])) as Record<SignalType, ScreenedRow[]>;
    for (const item of screened) groups[item.signal].push(item);
    return groups;
  }, [screened]);

  const visible = useMemo(() => {
    const list = filter ? bySignal[filter] : screened;
    return [...list].sort((a, b) => {
      const av = sortValue(a, sort.key) ?? -Infinity;
      const bv = sortValue(b, sort.key) ?? -Infinity;
      return sort.desc ? bv - av : av - bv;
    });
  }, [filter, bySignal, screened, sort]);

  const onSort = (key: SortKey) => setSort((prev) => ({ key, desc: prev.key === key ? !prev.desc : true }));
  const toggle = (type: SignalType) => {
    setFilter((prev) => (prev === type ? null : type));
    setLimit(PAGE);
  };

  if (!screened.length) return null;

  return (
    <Stack gap="sm" component="section" aria-labelledby="signals-title">
      <Group justify="space-between" gap="xs">
        <Text fw={700} size="lg" id="signals-title">
          Market signals: price vs open interest
        </Text>
        <Text size="xs" c="dimmed">
          24h changes · Binance open interest
        </Text>
      </Group>
      <Text size="sm" c="dimmed">
        Whether open interest rises or falls alongside price shows who is driving the move. Tap a quadrant to filter. Moves under {PRICE_DEADBAND}% in price or{" "}
        {OI_DEADBAND}% in open interest count as no clear signal.
      </Text>

      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
        {quadrantLayout.map((type) => (
          <Quadrant key={type} type={type} items={bySignal[type]} active={filter === type} onToggle={() => toggle(type)} />
        ))}
      </SimpleGrid>

      <Group justify="space-between" gap="xs">
        <Group gap="xs">
          <Button size="compact-sm" variant={filter === null ? "light" : "default"} onClick={() => setFilter(null)}>
            All ({screened.length})
          </Button>
          <Button size="compact-sm" variant={filter === "neutral" ? "light" : "default"} onClick={() => toggle("neutral")}>
            No clear signal ({bySignal.neutral.length})
          </Button>
        </Group>
        {filter && filter !== "neutral" && (
          <Text size="xs" c="dimmed" maw={560}>
            {SIGNALS[filter].description}
          </Text>
        )}
      </Group>

      <Paper withBorder radius="md">
        <TableScrollContainer minWidth={520}>
          <Table highlightOnHover verticalSpacing="xs" fz="sm">
            <TableThead>
              <TableTr>
                <TableTh>
                  <Text size="xs" fw={700} c="dimmed">
                    Coin
                  </Text>
                </TableTh>
                <TableTh ta="right" visibleFrom="sm">
                  <Text size="xs" fw={700} c="dimmed">
                    Price
                  </Text>
                </TableTh>
                <SortTh label="Price 24h" sortKey="change24h" sort={sort} onSort={onSort} />
                <SortTh label="OI 24h" sortKey="oiChange" sort={sort} onSort={onSort} />
                <SortTh label="Volume" sortKey="volume" sort={sort} onSort={onSort} desktopOnly />
                <SortTh label="Signal" sortKey="strength" sort={sort} onSort={onSort} />
              </TableTr>
            </TableThead>
            <TableTbody>
              {visible.slice(0, limit).map(({ row, signal }) => {
                const info = SIGNALS[signal];
                return (
                  <TableTr key={row.symbol} onClick={() => onSelect(row.symbol)} style={{ cursor: "pointer" }}>
                    <TableTd>
                      <Group gap="xs" wrap="nowrap">
                        <Avatar src={row.image} size={22} alt="" />
                        <Text size="sm" fw={700}>
                          {row.symbol}
                        </Text>
                      </Group>
                    </TableTd>
                    <TableTd ta="right" ff="monospace" visibleFrom="sm">
                      {formatPrice(row.price)}
                    </TableTd>
                    <TableTd ta="right" ff="monospace" c={changeColor(row.change24h)}>
                      {formatPercent(row.change24h)}
                    </TableTd>
                    <TableTd ta="right" ff="monospace" c={changeColor(row.oiChange24h)}>
                      {formatPercent(row.oiChange24h)}
                    </TableTd>
                    <TableTd ta="right" ff="monospace" visibleFrom="sm">
                      {formatCompactUsd(row.volume24h)}
                    </TableTd>
                    <TableTd ta="right">
                      <Badge variant="light" color={info.color} size="sm" style={{ whiteSpace: "nowrap" }}>
                        {info.label}
                      </Badge>
                    </TableTd>
                  </TableTr>
                );
              })}
            </TableTbody>
          </Table>
        </TableScrollContainer>
      </Paper>
      {visible.length > limit && (
        <Button variant="subtle" size="xs" onClick={() => setLimit((n) => n + PAGE)} style={{ alignSelf: "center" }}>
          Show {Math.min(PAGE, visible.length - limit)} more
        </Button>
      )}
    </Stack>
  );
}
