"use client";

import { useMemo, useState } from "react";
import { Avatar, Badge, Box, Group, SegmentedControl, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import type { DerivativesRow } from "@/lib/derivatives-market";
import { funding8hToApr, toFunding8h, toFundingApr, VENUES, type Venue } from "@/lib/funding";
import { BASELINE_APR, formatApr, formatFundingRate, fundingHeat } from "./format";

type Display = "rate" | "apr";

const ROWS = 24;
const ARB_SPREAD_APR = 20;

function arbitrage(row: DerivativesRow) {
  const quotes = VENUES.flatMap((venue) => {
    const quote = row.venues[venue];
    return quote ? [{ venue, apr: toFundingApr(quote) }] : [];
  });
  if (quotes.length < 2) return null;
  const sorted = [...quotes].sort((a, b) => a.apr - b.apr);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const spread = high.apr - low.apr;
  return spread >= ARB_SPREAD_APR ? { longOn: low.venue, shortOn: high.venue, spread } : null;
}

function Cell({ venue, row, display }: { venue: Venue | "avg"; row: DerivativesRow; display: Display }) {
  const quote = venue === "avg" ? null : row.venues[venue];
  const rate8h = venue === "avg" ? row.avgFunding8h : quote ? toFunding8h(quote) : null;
  const apr = rate8h === null ? null : venue === "avg" ? funding8hToApr(rate8h) : toFundingApr(quote!);
  const text = rate8h === null ? "—" : display === "apr" ? formatApr(apr) : formatFundingRate(Math.abs(rate8h) < 5e-6 ? 0 : rate8h, 3);
  const label =
    rate8h === null
      ? `${row.symbol} is not listed on ${venue}`
      : `${row.symbol} · ${venue === "avg" ? "OI-weighted average" : venue} · ${formatFundingRate(rate8h)} per 8h · ${formatApr(apr)} a year`;
  return (
    <Tooltip label={label} withArrow openDelay={120}>
      <Box
        py={8}
        px={6}
        ta="center"
        style={{
          background: fundingHeat(apr),
          borderRadius: 6,
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: 12,
          fontWeight: venue === "avg" ? 800 : 600,
          color: rate8h === null ? "var(--mantine-color-dimmed)" : undefined,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </Box>
    </Tooltip>
  );
}

function Legend() {
  return (
    <Group gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed">
        Shorts paying
      </Text>
      <Box
        w={160}
        h={8}
        style={{
          borderRadius: 4,
          background: `linear-gradient(90deg, ${fundingHeat(-30)}, ${fundingHeat(-3)}, ${fundingHeat(BASELINE_APR)}, ${fundingHeat(25)}, ${fundingHeat(45)}, ${fundingHeat(70)})`,
        }}
      />
      <Text size="xs" c="dimmed">
        Overheated longs
      </Text>
    </Group>
  );
}

export function FundingHeatmap({ rows, onSelect }: { rows: DerivativesRow[]; onSelect: (symbol: string) => void }) {
  const [display, setDisplay] = useState<Display>("rate");
  const top = useMemo(() => [...rows].sort((a, b) => (b.totalOiUsd ?? 0) - (a.totalOiUsd ?? 0)).slice(0, ROWS), [rows]);
  const columns = `minmax(92px, 1.1fr) repeat(${VENUES.length + 1}, minmax(78px, 1fr)) minmax(120px, 1.2fr)`;

  return (
    <Stack gap="sm">
      <Group justify="space-between" gap="sm">
        <Legend />
        <SegmentedControl
          size="xs"
          value={display}
          onChange={(value) => setDisplay(value as Display)}
          data={[
            { value: "rate", label: "8h rate" },
            { value: "apr", label: "Annualized %" },
          ]}
          aria-label="Heatmap display"
        />
      </Group>
      <Box style={{ overflowX: "auto" }}>
        <Box miw={720} style={{ display: "grid", gridTemplateColumns: columns, gap: 4, alignItems: "center" }} role="table" aria-label="Funding rate heatmap">
          <Text size="xs" fw={700} c="dimmed" role="columnheader">
            Top {top.length} by OI
          </Text>
          {VENUES.map((venue) => (
            <Text key={venue} size="xs" fw={700} c="dimmed" ta="center" role="columnheader">
              {venue}
            </Text>
          ))}
          <Text size="xs" fw={700} c="dimmed" ta="center" role="columnheader">
            Avg (8h)
          </Text>
          <Text size="xs" fw={700} c="dimmed" ta="center" role="columnheader">
            Arbitrage
          </Text>
          {top.map((row) => {
            const arb = arbitrage(row);
            return (
              <Box key={row.id} style={{ display: "contents" }} role="row">
                <UnstyledButton onClick={() => onSelect(row.symbol)} aria-label={`Chart ${row.name} funding history`}>
                  <Group gap={6} wrap="nowrap">
                    <Avatar src={row.image} size={20} alt="" />
                    <Text size="sm" fw={700}>
                      {row.symbol}
                    </Text>
                  </Group>
                </UnstyledButton>
                {VENUES.map((venue) => (
                  <Cell key={venue} venue={venue} row={row} display={display} />
                ))}
                <Cell venue="avg" row={row} display={display} />
                <Box ta="center">
                  {arb ? (
                    <Tooltip
                      label={`Funding differs by ${arb.spread.toFixed(1)}% a year: long on ${arb.longOn} and short on ${arb.shortOn} collects the gap, before fees and price risk.`}
                      multiline
                      w={260}
                      withArrow
                    >
                      <Badge color="violet" variant="light" size="sm" style={{ cursor: "help" }}>
                        {arb.spread.toFixed(0)}% · {arb.longOn.slice(0, 3)}→{arb.shortOn.slice(0, 3)}
                      </Badge>
                    </Tooltip>
                  ) : (
                    <Text size="xs" c="dimmed">
                      —
                    </Text>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
      <Text size="xs" c="dimmed">
        Grey is the 0.01% per 8h baseline most exchanges default to (about {BASELINE_APR}% a year). Arbitrage flags coins whose funding differs by {ARB_SPREAD_APR}%+ a
        year between exchanges.
      </Text>
    </Stack>
  );
}
