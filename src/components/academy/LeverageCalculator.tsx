"use client";

import { useState } from "react";
import { Alert, Badge, Group, NumberInput, Paper, Progress, SegmentedControl, SimpleGrid, Slider, Stack, Text } from "@mantine/core";
import { formatPrice } from "@/lib/format";
import { MAINTENANCE_MARGIN, liquidationPrice, moveToLiquidation, riskLevel } from "@/lib/trading";

export function LeverageCalculator() {
  const [side, setSide] = useState<"long" | "short">("long");
  const [margin, setMargin] = useState<number>(100);
  const [entry, setEntry] = useState<number>(60000);
  const [leverage, setLeverage] = useState<number>(10);

  const size = margin * leverage;
  const qty = entry > 0 ? size / entry : 0;
  const moveToLiq = moveToLiquidation(leverage);
  const liqPrice = liquidationPrice(side, entry, leverage);
  const pnlPerPct = size * 0.01;
  const risk = riskLevel(leverage);

  return (
    <Paper withBorder p="lg" my="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={700}>Leverage & liquidation calculator</Text>
          <SegmentedControl
            size="xs"
            value={side}
            onChange={(v) => setSide(v as "long" | "short")}
            data={[
              { value: "long", label: "Long" },
              { value: "short", label: "Short" },
            ]}
          />
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <NumberInput label="Margin (USDT)" value={margin} onChange={(v) => setMargin(Number(v) || 0)} min={1} thousandSeparator="," />
          <NumberInput label="Entry price (USD)" value={entry} onChange={(v) => setEntry(Number(v) || 0)} min={0} thousandSeparator="," decimalScale={6} />
        </SimpleGrid>
        <Stack gap={4}>
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              Leverage: {leverage}x
            </Text>
            <Badge color={risk.color} variant="light">
              {risk.label}
            </Badge>
          </Group>
          <Slider
            value={leverage}
            onChange={setLeverage}
            min={1}
            max={50}
            step={1}
            color={risk.color}
            marks={[1, 5, 10, 25, 50].map((v) => ({ value: v, label: `${v}x` }))}
            mb="lg"
            aria-label="Leverage"
          />
        </Stack>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              Position size
            </Text>
            <Text fw={700} ff="monospace">
              {formatPrice(size)}
            </Text>
            <Text size="xs" c="dimmed">
              {qty.toPrecision(4)} units
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              P&L per 1% move
            </Text>
            <Text fw={700} ff="monospace">
              ±{formatPrice(pnlPerPct)}
            </Text>
            <Text size="xs" c="dimmed">
              {((pnlPerPct / Math.max(margin, 1)) * 100).toFixed(0)}% of margin
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              Est. liquidation price
            </Text>
            <Text fw={700} ff="monospace" c="red">
              {liqPrice === null ? "—" : formatPrice(liqPrice)}
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              Adverse move to liquidation
            </Text>
            <Text fw={700} ff="monospace" c={risk.color}>
              {(moveToLiq * 100).toFixed(1)}%
            </Text>
          </Stack>
        </SimpleGrid>
        <Progress value={Math.min(100, moveToLiq * 100)} color={risk.color} size="lg" radius="xl" aria-label="Buffer before liquidation" />
        {leverage > 20 && (
          <Alert color="red" variant="light">
            At {leverage}x a normal intraday move of {(moveToLiq * 100).toFixed(1)}% can wipe out this position. Consider reducing leverage.
          </Alert>
        )}
        <Text size="xs" c="dimmed">
          Estimate for isolated margin with {MAINTENANCE_MARGIN * 100}% maintenance margin. Excludes fees and funding.
        </Text>
      </Stack>
    </Paper>
  );
}
