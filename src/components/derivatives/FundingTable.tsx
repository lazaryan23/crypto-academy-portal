"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Anchor,
  Avatar,
  Box,
  Group,
  SegmentedControl,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconSearch, IconSelector } from "@tabler/icons-react";
import type { DerivativesRow } from "@/lib/derivatives-market";
import { funding8hToApr, toFunding8h, toFundingApr, VENUES, type Venue, type VenueQuote } from "@/lib/funding";
import { changeColor, formatCompactUsd, formatPercent, formatPrice } from "@/lib/format";
import { formatApr, formatFundingRate, fundingTint, utcTime } from "./format";

type SortKey = "rank" | "price" | "change24h" | Venue | "avg" | "spread" | "oi" | "oiChange";
type Display = "rate" | "apr";

function sortValue(row: DerivativesRow, key: SortKey): number | null {
  switch (key) {
    case "rank":
      return row.rank;
    case "price":
      return row.price;
    case "change24h":
      return row.change24h;
    case "avg":
      return row.avgFunding8h;
    case "spread":
      return row.spreadApr;
    case "oi":
      return row.totalOiUsd;
    case "oiChange":
      return row.oiChange24h;
    default: {
      const quote = row.venues[key];
      return quote ? toFunding8h(quote) : null;
    }
  }
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "right",
  desktopOnly = false,
}: {
  label: ReactNode;
  sortKey: SortKey;
  sort: { key: SortKey; desc: boolean };
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
  desktopOnly?: boolean;
}) {
  const active = sort.key === sortKey;
  const Icon = active ? (sort.desc ? IconChevronDown : IconChevronUp) : IconSelector;
  return (
    <TableTh ta={align} visibleFrom={desktopOnly ? "sm" : undefined} style={{ whiteSpace: "nowrap" }} aria-sort={active ? (sort.desc ? "descending" : "ascending") : undefined}>
      <UnstyledButton onClick={() => onSort(sortKey)} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Text size="xs" fw={700} c={active ? undefined : "dimmed"}>
          {label}
        </Text>
        <Icon size={14} stroke={1.8} style={{ opacity: active ? 1 : 0.5 }} />
      </UnstyledButton>
    </TableTh>
  );
}

function stickyCell(selected: boolean) {
  return {
    position: "sticky",
    left: 0,
    zIndex: 1,
    backgroundColor: "var(--page-bg)",
    backgroundImage: selected ? "linear-gradient(var(--mantine-primary-color-light), var(--mantine-primary-color-light))" : undefined,
  } as const;
}

function FundingCell({ venue, quote, display }: { venue: Venue; quote: VenueQuote | undefined; display: Display }) {
  if (!quote) {
    return (
      <TableTd ta="right">
        <Text size="sm" c="dimmed">
          —
        </Text>
      </TableTd>
    );
  }
  const apr = toFundingApr(quote);
  const next = utcTime(quote.nextFundingTime);
  const label = `${venue} · paid every ${quote.intervalHours}h · ${formatApr(apr)} a year${next ? ` · next ${next}` : ""}`;
  return (
    <TableTd ta="right" style={{ background: fundingTint(apr) }}>
      <Tooltip label={label} withArrow openDelay={150}>
        <Text size="sm" ff="monospace" fw={500} component="span" style={{ whiteSpace: "nowrap" }}>
          {display === "apr" ? formatApr(apr) : formatFundingRate(quote.funding)}
          {display === "rate" && quote.intervalHours !== 8 && (
            <Text span size="xs" c="dimmed" ml={4}>
              {quote.intervalHours}h
            </Text>
          )}
        </Text>
      </Tooltip>
    </TableTd>
  );
}

export function FundingTable({ rows, selected, onSelect }: { rows: DerivativesRow[]; selected: string; onSelect: (symbol: string) => void }) {
  const [query, setQuery] = useState("");
  const [display, setDisplay] = useState<Display>("rate");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "oi", desc: true });

  const onSort = (key: SortKey) =>
    setSort((prev) => (prev.key === key ? { key, desc: !prev.desc } : { key, desc: key !== "rank" }));

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle ? rows.filter((row) => row.symbol.toLowerCase().includes(needle) || row.name.toLowerCase().includes(needle)) : rows;
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av === null && bv === null) return (a.rank ?? 9999) - (b.rank ?? 9999);
      if (av === null) return 1;
      if (bv === null) return -1;
      return sort.desc ? bv - av : av - bv;
    });
  }, [rows, query, sort]);

  return (
    <Box>
      <Group justify="space-between" gap="sm" mb="sm">
        <TextInput
          placeholder="Filter coins"
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          w={{ base: "100%", xs: 240 }}
          aria-label="Filter coins"
        />
        <SegmentedControl
          size="xs"
          value={display}
          onChange={(value) => setDisplay(value as Display)}
          data={[
            { value: "rate", label: "Funding rate" },
            { value: "apr", label: "Annualized" },
          ]}
          aria-label="Funding display"
        />
      </Group>
      <TableScrollContainer minWidth={760} type="native">
        <Table highlightOnHover verticalSpacing={8} horizontalSpacing={8} fz="sm">
          <TableThead>
            <TableTr>
              <SortHeader label="#" sortKey="rank" sort={sort} onSort={onSort} align="left" desktopOnly />
              <TableTh style={stickyCell(false)}>
                <Text size="xs" fw={700} c="dimmed">
                  Coin
                </Text>
              </TableTh>
              <SortHeader label="Price" sortKey="price" sort={sort} onSort={onSort} desktopOnly />
              <SortHeader label="24h" sortKey="change24h" sort={sort} onSort={onSort} desktopOnly />
              {VENUES.map((venue) => (
                <SortHeader key={venue} label={venue} sortKey={venue} sort={sort} onSort={onSort} />
              ))}
              <SortHeader
                label={
                  <Tooltip label="Average across exchanges, weighted by open interest and converted to an 8-hour rate" withArrow multiline w={240}>
                    <span>Avg (8h)</span>
                  </Tooltip>
                }
                sortKey="avg"
                sort={sort}
                onSort={onSort}
              />
              <SortHeader
                label={
                  <Tooltip label="Gap between the highest and lowest annualized funding across exchanges" withArrow multiline w={240}>
                    <span>Spread</span>
                  </Tooltip>
                }
                sortKey="spread"
                sort={sort}
                onSort={onSort}
              />
              <SortHeader label="Open interest" sortKey="oi" sort={sort} onSort={onSort} />
              <SortHeader
                label={
                  <Tooltip label="Change in Binance open interest over the last 24 hours" withArrow>
                    <span>OI 24h</span>
                  </Tooltip>
                }
                sortKey="oiChange"
                sort={sort}
                onSort={onSort}
              />
            </TableTr>
          </TableThead>
          <TableTbody>
            {visible.map((row) => {
              const isSelected = row.symbol === selected;
              const avgApr = row.avgFunding8h === null ? null : funding8hToApr(row.avgFunding8h);
              return (
                <TableTr
                  key={row.id}
                  onClick={() => onSelect(row.symbol)}
                  bg={isSelected ? "var(--mantine-primary-color-light)" : undefined}
                  style={{ cursor: "pointer" }}
                  aria-selected={isSelected}
                >
                  <TableTd visibleFrom="sm">
                    <Text size="sm" c="dimmed">
                      {row.rank ?? "—"}
                    </Text>
                  </TableTd>
                  <TableTd style={stickyCell(isSelected)}>
                    <Group gap="xs" wrap="nowrap">
                      <Avatar src={row.image} size={22} alt="" />
                      <Anchor
                        component={Link}
                        href={`/crypto/${row.id}`}
                        onClick={(event) => event.stopPropagation()}
                        size="sm"
                        fw={600}
                        c="inherit"
                        title={row.name}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {row.symbol}
                      </Anchor>
                    </Group>
                  </TableTd>
                  <TableTd ta="right" ff="monospace" visibleFrom="sm" style={{ whiteSpace: "nowrap" }}>
                    {formatPrice(row.price)}
                  </TableTd>
                  <TableTd ta="right" visibleFrom="sm">
                    <Text size="sm" c={changeColor(row.change24h)} ff="monospace">
                      {formatPercent(row.change24h)}
                    </Text>
                  </TableTd>
                  {VENUES.map((venue) => (
                    <FundingCell key={venue} venue={venue} quote={row.venues[venue]} display={display} />
                  ))}
                  <TableTd ta="right" style={{ background: fundingTint(avgApr) }}>
                    <Text size="sm" ff="monospace" fw={700} style={{ whiteSpace: "nowrap" }}>
                      {display === "apr" ? formatApr(avgApr) : formatFundingRate(row.avgFunding8h)}
                    </Text>
                  </TableTd>
                  <TableTd ta="right">
                    <Text size="sm" ff="monospace" c={row.spreadApr !== null && row.spreadApr >= 20 ? "orange" : undefined}>
                      {row.spreadApr === null ? "—" : `${row.spreadApr.toFixed(1)}%`}
                    </Text>
                  </TableTd>
                  <TableTd ta="right" ff="monospace">
                    {formatCompactUsd(row.totalOiUsd)}
                  </TableTd>
                  <TableTd ta="right">
                    <Text size="sm" ff="monospace" c={changeColor(row.oiChange24h)}>
                      {formatPercent(row.oiChange24h)}
                    </Text>
                  </TableTd>
                </TableTr>
              );
            })}
          </TableTbody>
        </Table>
      </TableScrollContainer>
      {!visible.length && (
        <Text size="sm" c="dimmed" ta="center" py="lg">
          No coins match &ldquo;{query}&rdquo;.
        </Text>
      )}
    </Box>
  );
}
