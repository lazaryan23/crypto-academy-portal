"use client";

import { useMemo, useState } from "react";
import { Box, Group, Paper, Stack, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import type { LeverageMap } from "@/lib/leverage-map";
import { formatCompactUsd, formatPrice } from "@/lib/format";

const HEIGHT = 340;
const PAD = { top: 16, bottom: 28 };
const WIDE_SIDE = 56;
const NARROW_SIDE = 4;
const LONG_COLOR = "var(--mantine-color-red-6)";
const SHORT_COLOR = "var(--mantine-color-teal-6)";

function compactPrice(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10_000 ? 1 : 2)}K`;
  return formatPrice(value);
}

export function LeverageMapChart({ map }: { map: LeverageMap }) {
  const { ref, width } = useElementSize();
  const [hover, setHover] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const buckets = map.buckets;
    const below = buckets.map((b, i) => ({ i, b })).filter(({ b }) => b.price < map.price);
    const above = buckets.map((b, i) => ({ i, b })).filter(({ b }) => b.price >= map.price);
    const cumulative = new Array<number>(buckets.length).fill(0);
    let running = 0;
    for (const { i, b } of [...below].reverse()) {
      running += b.longUsd;
      cumulative[i] = running;
    }
    running = 0;
    for (const { i, b } of above) {
      running += b.shortUsd;
      cumulative[i] = running;
    }
    const maxBar = Math.max(1, ...buckets.map((b) => Math.max(b.longUsd, b.shortUsd)));
    const maxCumulative = Math.max(1, ...cumulative);
    return { cumulative, maxBar, maxCumulative };
  }, [map]);

  const side = width >= 560 ? WIDE_SIDE : NARROW_SIDE;
  const pad = { ...PAD, left: side, right: side };
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const low = map.buckets[0].price - map.bucketSize / 2;
  const high = map.buckets[map.buckets.length - 1].price + map.bucketSize / 2;
  const x = (price: number) => pad.left + ((price - low) / (high - low)) * plotW;
  const yBar = (usd: number) => PAD.top + plotH - (usd / geometry.maxBar) * plotH;
  const yCum = (usd: number) => PAD.top + plotH - (usd / geometry.maxCumulative) * plotH;
  const barW = Math.max(1, plotW / map.buckets.length - 1.5);

  const longLine = map.buckets
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.price < map.price)
    .map(({ b, i }) => `${x(b.price).toFixed(1)},${yCum(geometry.cumulative[i]).toFixed(1)}`)
    .join(" ");
  const shortLine = map.buckets
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.price >= map.price)
    .map(({ b, i }) => `${x(b.price).toFixed(1)},${yCum(geometry.cumulative[i]).toFixed(1)}`)
    .join(" ");

  const ticks = Array.from({ length: 5 }, (_, i) => low + ((high - low) * (i + 0.5)) / 5);
  const hovered = hover === null ? null : map.buckets[hover];

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    if (px < pad.left || px > pad.left + plotW) return setHover(null);
    const index = Math.min(map.buckets.length - 1, Math.max(0, Math.floor(((px - pad.left) / plotW) * map.buckets.length)));
    setHover(index);
  };

  return (
    <Stack gap="xs">
      <Box ref={ref} pos="relative" h={HEIGHT}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`Estimated ${map.base} liquidation levels around ${formatPrice(map.price)}`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            style={{ display: "block", touchAction: "pan-y" }}
          >
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <line key={f} x1={pad.left} x2={pad.left + plotW} y1={PAD.top + plotH * (1 - f)} y2={PAD.top + plotH * (1 - f)} stroke="var(--mantine-color-default-border)" strokeDasharray="2 4" />
            ))}
            {map.buckets.map((b, i) => {
              const usd = b.price < map.price ? b.longUsd : b.shortUsd;
              if (usd <= 0) return null;
              const top = yBar(usd);
              return (
                <rect
                  key={i}
                  x={x(b.price) - barW / 2}
                  y={top}
                  width={barW}
                  height={PAD.top + plotH - top}
                  rx={1}
                  fill={b.price < map.price ? LONG_COLOR : SHORT_COLOR}
                  opacity={hover === null || hover === i ? 0.85 : 0.45}
                />
              );
            })}
            {longLine && <polyline points={longLine} fill="none" stroke={LONG_COLOR} strokeWidth={2} strokeOpacity={0.9} />}
            {shortLine && <polyline points={shortLine} fill="none" stroke={SHORT_COLOR} strokeWidth={2} strokeOpacity={0.9} />}
            <line x1={x(map.price)} x2={x(map.price)} y1={PAD.top - 6} y2={PAD.top + plotH} stroke="var(--mantine-color-text)" strokeDasharray="4 3" strokeWidth={1.2} />
            <text x={x(map.price)} y={PAD.top - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--mantine-color-text)" dy={-2}>
              {formatPrice(map.price)}
            </text>
            {ticks.map((tick) => (
              <text key={tick} x={x(tick)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="var(--mantine-color-dimmed)">
                {compactPrice(tick)}
              </text>
            ))}
            <text x={side === WIDE_SIDE ? pad.left - 8 : 2} y={PAD.top + 10} textAnchor={side === WIDE_SIDE ? "end" : "start"} fontSize={11} fill="var(--mantine-color-dimmed)">
              {formatCompactUsd(geometry.maxBar)}
            </text>
            <text x={width - 2} y={PAD.top + 10} textAnchor="end" fontSize={11} fill="var(--mantine-color-dimmed)">
              {formatCompactUsd(geometry.maxCumulative)}
            </text>
            {hovered && hover !== null && (
              <line x1={x(hovered.price)} x2={x(hovered.price)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--mantine-color-dimmed)" strokeWidth={1} />
            )}
          </svg>
        )}
        {hovered && hover !== null && (
          <Paper
            withBorder
            shadow="md"
            p="xs"
            radius="md"
            pos="absolute"
            top={PAD.top}
            style={{
              pointerEvents: "none",
              zIndex: 2,
              background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
              ...(x(hovered.price) > width / 2 ? { right: width - x(hovered.price) + 12 } : { left: x(hovered.price) + 12 }),
            }}
          >
            <Stack gap={2}>
              <Text size="xs" fw={700}>
                {formatPrice(hovered.price - map.bucketSize / 2)} – {formatPrice(hovered.price + map.bucketSize / 2)}
              </Text>
              <Text size="xs" c="dimmed">
                {(((hovered.price - map.price) / map.price) * 100).toFixed(1)}% from current price
              </Text>
              {hovered.price < map.price ? (
                <>
                  <Text size="xs">
                    Longs at this level: <b>{formatCompactUsd(hovered.longUsd)}</b>
                  </Text>
                  <Text size="xs">
                    Longs liquidated if price falls here: <b>{formatCompactUsd(geometry.cumulative[hover])}</b>
                  </Text>
                </>
              ) : (
                <>
                  <Text size="xs">
                    Shorts at this level: <b>{formatCompactUsd(hovered.shortUsd)}</b>
                  </Text>
                  <Text size="xs">
                    Shorts liquidated if price rises here: <b>{formatCompactUsd(geometry.cumulative[hover])}</b>
                  </Text>
                </>
              )}
            </Stack>
          </Paper>
        )}
      </Box>
      <Group gap="lg">
        <Group gap={6} wrap="nowrap">
          <Box w={10} h={10} style={{ borderRadius: 2, background: LONG_COLOR }} />
          <Text size="xs" c="dimmed">
            Long liquidations
          </Text>
        </Group>
        <Group gap={6} wrap="nowrap">
          <Box w={10} h={10} style={{ borderRadius: 2, background: SHORT_COLOR }} />
          <Text size="xs" c="dimmed">
            Short liquidations
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          Lines: cumulative from current price (right axis)
        </Text>
      </Group>
    </Stack>
  );
}
