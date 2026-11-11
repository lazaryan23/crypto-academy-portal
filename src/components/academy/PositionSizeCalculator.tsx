"use client";

import { useState } from "react";
import { Alert, NumberInput, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { formatPrice } from "@/lib/format";

export function PositionSizeCalculator() {
  const [account, setAccount] = useState<number>(5000);
  const [riskPct, setRiskPct] = useState<number>(1);
  const [entry, setEntry] = useState<number>(60000);
  const [stop, setStop] = useState<number>(58800);

  const riskAmount = (account * riskPct) / 100;
  const stopDistance = entry > 0 ? Math.abs(entry - stop) / entry : 0;
  const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;
  const requiredLeverage = account > 0 ? positionSize / account : 0;
  const maxSafeLeverage = stopDistance > 0 ? Math.floor(1 / (stopDistance * 2)) : 0;

  return (
    <Paper withBorder p="lg" my="md">
      <Stack gap="md">
        <Text fw={700}>Position size calculator</Text>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
          <NumberInput label="Account size (USDT)" value={account} onChange={(v) => setAccount(Number(v) || 0)} min={0} thousandSeparator="," />
          <NumberInput label="Risk per trade (%)" value={riskPct} onChange={(v) => setRiskPct(Number(v) || 0)} min={0.1} max={10} step={0.25} decimalScale={2} />
          <NumberInput label="Entry price" value={entry} onChange={(v) => setEntry(Number(v) || 0)} min={0} thousandSeparator="," decimalScale={6} />
          <NumberInput label="Stop-loss price" value={stop} onChange={(v) => setStop(Number(v) || 0)} min={0} thousandSeparator="," decimalScale={6} />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              Max loss if stopped
            </Text>
            <Text fw={700} ff="monospace" c="red">
              {formatPrice(riskAmount)}
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              Stop distance
            </Text>
            <Text fw={700} ff="monospace">
              {(stopDistance * 100).toFixed(2)}%
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              Position size
            </Text>
            <Text fw={700} ff="monospace" c="brand">
              {formatPrice(positionSize)}
            </Text>
          </Stack>
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              Leverage needed
            </Text>
            <Text fw={700} ff="monospace">
              {requiredLeverage.toFixed(1)}x
            </Text>
          </Stack>
        </SimpleGrid>
        {riskPct > 2 && (
          <Alert color="orange" variant="light">
            Risking more than 2% per trade makes a losing streak very costly. Most professionals stay at 0.5–2%.
          </Alert>
        )}
        {stopDistance > 0 && (
          <Text size="sm" c="dimmed">
            Keep leverage at or below ~{Math.max(1, maxSafeLeverage)}x so your liquidation price sits well beyond the stop-loss.
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
