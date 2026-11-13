"use client";

import { useState } from "react";
import { Box, Group, Paper, Stack, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { formatStrike, type StrikeRow } from "@/lib/options-math";
import { formatPrice } from "@/lib/format";

const HEIGHT = 320;
const TOP = 18;
const BOTTOM = 26;
const CALL_COLOR = "var(--mantine-color-teal-6)";
const PUT_COLOR = "var(--mantine-color-red-6)";

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 1 : 2)}K`;
  return value.toFixed(value >= 10 ? 0 : 1);
}

function strikeLabel(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K` : String(value);
}

export function StrikeChart({ strikes, spot, maxPain, unit }: { strikes: StrikeRow[]; spot: number; maxPain: number | null; unit: string }) {
  const { ref, width } = useElementSize();
  const [hover, setHover] = useState<number | null>(null);

  const side = width >= 560 ? 48 : 4;
  const plotW = Math.max(0, width - side * 2);
  const plotH = HEIGHT - TOP - BOTTOM;
  const mid = TOP + plotH / 2;
  const max = Math.max(1, ...strikes.map((row) => Math.max(row.callOi, row.putOi)));
  const slot = strikes.length ? plotW / strikes.length : 0;
  const barW = Math.max(1, slot - (slot > 6 ? 2 : 0.5));
  const xOf = (i: number) => side + slot * (i + 0.5);
  const xForPrice = (price: number) => {
    if (!strikes.length) return side;
    if (price <= strikes[0].strike) return xOf(0);
    if (price >= strikes[strikes.length - 1].strike) return xOf(strikes.length - 1);
    const upper = strikes.findIndex((row) => row.strike >= price);
    const lower = upper - 1;
    const t = (price - strikes[lower].strike) / (strikes[upper].strike - strikes[lower].strike);
    return xOf(lower) + t * slot;
  };
  const labelEvery = Math.max(1, Math.ceil(strikes.length / Math.max(2, Math.floor(plotW / 56))));
  const hovered = hover === null ? null : strikes[hover];

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - rect.left - side) / slot);
    setHover(index >= 0 && index < strikes.length ? index : null);
  };

  return (
    <Stack gap="xs">
      <Box ref={ref} pos="relative" h={HEIGHT}>
        {width > 0 && strikes.length > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`Open interest by strike: calls above, puts below${maxPain ? `, max pain ${formatStrike(maxPain)}` : ""}`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            style={{ display: "block", touchAction: "pan-y" }}
          >
            <line x1={side} x2={side + plotW} y1={mid} y2={mid} stroke="var(--mantine-color-default-border)" />
            {strikes.map((row, i) => {
              const callH = (row.callOi / max) * (plotH / 2);
              const putH = (row.putOi / max) * (plotH / 2);
              const dim = hover !== null && hover !== i;
              return (
                <g key={row.strike} opacity={dim ? 0.45 : 0.9}>
                  {callH > 0 && <rect x={xOf(i) - barW / 2} y={mid - callH} width={barW} height={callH} rx={1} fill={CALL_COLOR} />}
                  {putH > 0 && <rect x={xOf(i) - barW / 2} y={mid} width={barW} height={putH} rx={1} fill={PUT_COLOR} />}
                </g>
              );
            })}
            <line x1={xForPrice(spot)} x2={xForPrice(spot)} y1={TOP - 4} y2={TOP + plotH} stroke="var(--mantine-color-text)" strokeDasharray="4 3" strokeWidth={1.2} />
            <text x={xForPrice(spot)} y={TOP - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--mantine-color-text)">
              Spot {formatPrice(spot)}
            </text>
            {maxPain !== null && (
              <>
                <line x1={xForPrice(maxPain)} x2={xForPrice(maxPain)} y1={TOP + 8} y2={TOP + plotH} stroke="var(--mantine-color-orange-6)" strokeDasharray="2 3" strokeWidth={1.5} />
                <text x={xForPrice(maxPain)} y={TOP + plotH - 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--mantine-color-orange-6)">
                  Max pain
                </text>
              </>
            )}
            {strikes.map((row, i) =>
              i % labelEvery === 0 ? (
                <text key={row.strike} x={xOf(i)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="var(--mantine-color-dimmed)">
                  {strikeLabel(row.strike)}
                </text>
              ) : null,
            )}
            <text x={side === 4 ? 2 : side - 6} y={TOP + 10} textAnchor={side === 4 ? "start" : "end"} fontSize={11} fill={CALL_COLOR}>
              {compact(max)}
            </text>
            <text x={side === 4 ? 2 : side - 6} y={TOP + plotH} textAnchor={side === 4 ? "start" : "end"} fontSize={11} fill={PUT_COLOR}>
              {compact(max)}
            </text>
          </svg>
        )}
        {hovered && hover !== null && (
          <Paper
            withBorder
            shadow="md"
            p="xs"
            radius="md"
            pos="absolute"
            top={TOP}
            style={{
              pointerEvents: "none",
              zIndex: 2,
              background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
              ...(xOf(hover) > width / 2 ? { right: width - xOf(hover) + 12 } : { left: xOf(hover) + 12 }),
            }}
          >
            <Text size="xs" fw={700}>
              Strike {formatStrike(hovered.strike)}
            </Text>
            <Text size="xs" c="dimmed">
              {(((hovered.strike - spot) / spot) * 100).toFixed(1)}% from spot
            </Text>
            <Text size="xs">
              Calls: <b>{compact(hovered.callOi)} {unit}</b>
            </Text>
            <Text size="xs">
              Puts: <b>{compact(hovered.putOi)} {unit}</b>
            </Text>
          </Paper>
        )}
      </Box>
      <Group gap="lg">
        <Group gap={6} wrap="nowrap">
          <Box w={10} h={10} style={{ borderRadius: 2, background: CALL_COLOR }} />
          <Text size="xs" c="dimmed">
            Call open interest
          </Text>
        </Group>
        <Group gap={6} wrap="nowrap">
          <Box w={10} h={10} style={{ borderRadius: 2, background: PUT_COLOR }} />
          <Text size="xs" c="dimmed">
            Put open interest
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          In {unit}, one contract = 1 {unit}
        </Text>
      </Group>
    </Stack>
  );
}
