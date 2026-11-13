"use client";

import { useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { Box, Group, Paper, SegmentedControl, Stack, Switch, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { RelativeTime } from "@/components/common/RelativeTime";
import { formatCompactUsd, formatPercent, formatPrice } from "@/lib/format";
import { squarify } from "@/lib/treemap";
import classes from "./MarketHeatmap.module.css";

export type Timeframe = "1h" | "24h" | "7d";
type SizeBy = "marketCap" | "volume";

export interface HeatmapCoin {
  id: string;
  symbol: string;
  name: string;
  rank: number | null;
  price: number | null;
  marketCap: number | null;
  volume: number | null;
  change: Record<Timeframe, number | null>;
  stablecoin: boolean;
}

const colorScale: Record<Timeframe, number> = { "1h": 2, "24h": 6, "7d": 15 };
const NEUTRAL = [74, 80, 88] as const;
const GAIN = [10, 138, 74] as const;
const LOSS = [205, 50, 50] as const;

function mix(from: readonly number[], to: readonly number[], t: number) {
  const [r, g, b] = from.map((value, i) => Math.round(value + (to[i] - value) * t));
  return `rgb(${r}, ${g}, ${b})`;
}

export function heatColor(change: number | null, timeframe: Timeframe) {
  if (change === null) return mix(NEUTRAL, NEUTRAL, 0);
  const cap = colorScale[timeframe];
  const strength = Math.min(1, Math.abs(change) / cap);
  if (strength < 0.04) return mix(NEUTRAL, NEUTRAL, 0);
  return mix(NEUTRAL, change > 0 ? GAIN : LOSS, Math.pow(strength, 0.7));
}

function TileLabel({ coin, change, w, h }: { coin: HeatmapCoin; change: number | null; w: number; h: number }) {
  const font = Math.max(10, Math.min(30, Math.min(w, h * 1.4) / 5));
  const symbol = coin.symbol.toUpperCase();
  if (w >= 72 && h >= 58) {
    return (
      <>
        <span className={classes.symbol} style={{ fontSize: font }}>
          {symbol}
        </span>
        <span className={classes.detail} style={{ fontSize: Math.max(10, font * 0.52) }}>
          {formatPrice(coin.price)}
        </span>
        <span className={classes.detail} style={{ fontSize: Math.max(10, font * 0.58) }}>
          {formatPercent(change)}
        </span>
      </>
    );
  }
  if (w >= 44 && h >= 30) {
    return (
      <>
        <span className={classes.symbol} style={{ fontSize: Math.max(10, font * 0.9) }}>
          {symbol}
        </span>
        <span className={classes.detail} style={{ fontSize: 10 }}>
          {formatPercent(change)}
        </span>
      </>
    );
  }
  if (w >= 26 && h >= 16) {
    return (
      <span className={classes.symbol} style={{ fontSize: 9 }}>
        {symbol}
      </span>
    );
  }
  return null;
}

function HeatmapTooltip({ coin, timeframe }: { coin: HeatmapCoin; timeframe: Timeframe }) {
  return (
    <Stack gap={6}>
      <Group justify="space-between" gap="md" wrap="nowrap">
        <Text fw={700} size="sm">
          {coin.name}{" "}
          <Text span c="dimmed" size="xs">
            {coin.symbol.toUpperCase()}
          </Text>
        </Text>
        {coin.rank && (
          <Text size="xs" c="dimmed">
            #{coin.rank}
          </Text>
        )}
      </Group>
      <Group justify="space-between" gap="md" wrap="nowrap">
        <Text size="xs" c="dimmed">
          Price
        </Text>
        <Text size="sm" ff="monospace" fw={600}>
          {formatPrice(coin.price)}
        </Text>
      </Group>
      {(["1h", "24h", "7d"] as Timeframe[]).map((tf) => {
        const value = coin.change[tf];
        return (
          <Group key={tf} justify="space-between" gap="md" wrap="nowrap">
            <Text size="xs" c={tf === timeframe ? undefined : "dimmed"} fw={tf === timeframe ? 600 : undefined}>
              {tf} change
            </Text>
            <Text size="sm" ff="monospace" fw={600} c={value === null ? "dimmed" : value >= 0 ? "teal" : "red"}>
              {formatPercent(value)}
            </Text>
          </Group>
        );
      })}
      <Group justify="space-between" gap="md" wrap="nowrap">
        <Text size="xs" c="dimmed">
          Market cap
        </Text>
        <Text size="sm" ff="monospace">
          {formatCompactUsd(coin.marketCap)}
        </Text>
      </Group>
      <Group justify="space-between" gap="md" wrap="nowrap">
        <Text size="xs" c="dimmed">
          24h volume
        </Text>
        <Text size="sm" ff="monospace">
          {formatCompactUsd(coin.volume)}
        </Text>
      </Group>
    </Stack>
  );
}

const TOOLTIP_WIDTH = 230;
const TOOLTIP_HEIGHT = 210;

export function MarketHeatmap({ coins, updatedAt }: { coins: HeatmapCoin[]; updatedAt: string | null }) {
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");
  const [sizeBy, setSizeBy] = useState<SizeBy>("marketCap");
  const [count, setCount] = useState("100");
  const [includeStablecoins, setIncludeStablecoins] = useState(false);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const { ref, width } = useElementSize();

  const height = width === 0 ? 640 : width >= 768 ? Math.round(Math.min(720, Math.max(480, width * 0.56))) : Math.round(Math.max(640, width * 2.1));

  const visible = useMemo(
    () => coins.slice(0, Number(count)).filter((coin) => includeStablecoins || !coin.stablecoin),
    [coins, count, includeStablecoins],
  );

  const tiles = useMemo(
    () =>
      width > 0
        ? squarify(
            visible.map((coin) => ({ value: (sizeBy === "marketCap" ? coin.marketCap : coin.volume) ?? 0, data: coin })),
            { x: 0, y: 0, w: width, h: height },
          )
        : [],
    [visible, sizeBy, width, height],
  );

  const breadth = useMemo(() => {
    let up = 0;
    let down = 0;
    for (const coin of visible) {
      const value = coin.change[timeframe];
      if (value === null) continue;
      if (value > 0) up += 1;
      else if (value < 0) down += 1;
    }
    return { up, down };
  }, [visible, timeframe]);

  const hovered = hover ? visible.find((coin) => coin.id === hover.id) : undefined;
  const tooltipLeft = hover ? (hover.x + 16 + TOOLTIP_WIDTH > width ? Math.max(0, hover.x - 16 - TOOLTIP_WIDTH) : hover.x + 16) : 0;
  const tooltipTop = hover ? (hover.y + 16 + TOOLTIP_HEIGHT > height ? Math.max(0, hover.y - 16 - TOOLTIP_HEIGHT) : hover.y + 16) : 0;

  const track = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    const box = event.currentTarget.parentElement?.getBoundingClientRect();
    if (box) setHover({ id, x: event.clientX - box.left, y: event.clientY - box.top });
  };

  const cap = colorScale[timeframe];

  return (
    <Stack gap="md">
      <Group justify="space-between" gap="sm" align="flex-end">
        <Group gap="sm" wrap="wrap">
          <SegmentedControl
            value={timeframe}
            onChange={(value) => setTimeframe(value as Timeframe)}
            data={[
              { value: "1h", label: "1h" },
              { value: "24h", label: "24h" },
              { value: "7d", label: "7d" },
            ]}
            aria-label="Timeframe"
          />
          <SegmentedControl
            value={sizeBy}
            onChange={(value) => setSizeBy(value as SizeBy)}
            data={[
              { value: "marketCap", label: "Market cap" },
              { value: "volume", label: "24h volume" },
            ]}
            aria-label="Size tiles by"
          />
          <SegmentedControl
            value={count}
            onChange={setCount}
            data={[
              { value: "50", label: "Top 50" },
              { value: "100", label: "Top 100" },
            ]}
            aria-label="Number of coins"
          />
        </Group>
        <Switch label="Show stablecoins" checked={includeStablecoins} onChange={(e) => setIncludeStablecoins(e.currentTarget.checked)} />
      </Group>

      <Group justify="space-between" gap="sm">
        <Text size="sm" c="dimmed">
          <Text span c="teal" fw={700}>
            {breadth.up} rising
          </Text>{" "}
          ·{" "}
          <Text span c="red" fw={700}>
            {breadth.down} falling
          </Text>{" "}
          over {timeframe} · tiles sized by {sizeBy === "marketCap" ? "market cap" : "24h volume"}
        </Text>
        <Group gap={8} wrap="nowrap" aria-hidden>
          <Text size="xs" c="dimmed" ff="monospace">
            −{cap}%
          </Text>
          <Box className={classes.legend} />
          <Text size="xs" c="dimmed" ff="monospace">
            +{cap}%
          </Text>
        </Group>
      </Group>

      <Box ref={ref} className={classes.map} h={height} onMouseLeave={() => setHover(null)}>
        {tiles.map((tile) => {
          const coin = tile.data;
          const change = coin.change[timeframe];
          return (
            <Link
              key={coin.id}
              href={`/crypto/${coin.id}`}
              prefetch={false}
              className={classes.tile}
              style={{ left: tile.x, top: tile.y, width: tile.w, height: tile.h, background: heatColor(change, timeframe) }}
              aria-label={`${coin.name} (${coin.symbol.toUpperCase()}): ${formatPrice(coin.price)}, ${formatPercent(change)} over ${timeframe}, market cap ${formatCompactUsd(coin.marketCap)}`}
              onMouseMove={track(coin.id)}
              onFocus={() => setHover({ id: coin.id, x: tile.x + tile.w / 2, y: tile.y + tile.h / 2 })}
              onBlur={() => setHover(null)}
            >
              <TileLabel coin={coin} change={change} w={tile.w} h={tile.h} />
            </Link>
          );
        })}
        {hovered && (
          <Paper withBorder shadow="md" p="sm" className={classes.tooltip} style={{ left: tooltipLeft, top: tooltipTop, width: TOOLTIP_WIDTH }}>
            <HeatmapTooltip coin={hovered} timeframe={timeframe} />
          </Paper>
        )}
      </Box>

      <Text size="xs" c="dimmed">
        Top {count} coins by market cap from CoinGecko{includeStablecoins ? "" : ", stablecoins hidden"}. Colors are capped at ±{cap}% so smaller moves stay visible.
        {updatedAt && (
          <>
            {" "}
            Prices updated <RelativeTime iso={updatedAt} />.
          </>
        )}{" "}
        Click a tile to open the coin.
      </Text>
    </Stack>
  );
}
