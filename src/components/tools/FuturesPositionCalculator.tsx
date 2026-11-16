"use client";

import { useState, type ReactNode } from "react";
import { Alert, Button, Grid, GridCol, Group, NumberInput, Paper, SegmentedControl, Slider, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconArrowRight, IconSchool } from "@tabler/icons-react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { calculatePosition, MAINTENANCE_MARGIN_RATE, type Direction } from "@/lib/position-math";

const LEVERAGE_MARKS = [1, 10, 25, 50, 100].map((value) => ({ value, label: `${value}x` }));

function Output({ label, value, color, hint }: { label: string; value: ReactNode; color?: string; hint?: string }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={800} fz={22} ff="monospace" c={color} lh={1.2}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Stack>
  );
}

function num(value: string | number) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function FuturesPositionCalculator() {
  const [direction, setDirection] = useState<Direction>("long");
  const [balance, setBalance] = useState(5000);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState(60000);
  const [stop, setStop] = useState(58800);
  const [takeProfit, setTakeProfit] = useState<number | "">(63600);
  const [leverage, setLeverage] = useState(10);

  const result = calculatePosition({
    balance,
    riskPct,
    entry,
    stop,
    takeProfit: takeProfit === "" ? null : takeProfit,
    leverage,
    direction,
  });

  const switchDirection = (next: Direction) => {
    if (next === direction) return;
    setDirection(next);
    if (entry > 0) {
      setStop(Number((2 * entry - stop).toPrecision(8)));
      if (takeProfit !== "") setTakeProfit(Number((2 * entry - takeProfit).toPrecision(8)));
    }
  };

  return (
    <Grid gap="lg">
      <GridCol span={{ base: 12, md: 6 }}>
        <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md" h="100%">
          <Stack gap="md">
            <SegmentedControl
              fullWidth
              value={direction}
              onChange={(value) => switchDirection(value as Direction)}
              data={[
                { value: "long", label: "Long" },
                { value: "short", label: "Short" },
              ]}
              color={direction === "long" ? "teal" : "red"}
              aria-label="Position direction"
            />
            <Group grow align="flex-start">
              <NumberInput label="Account balance ($)" value={balance} onChange={(v) => setBalance(num(v))} min={0} thousandSeparator="," decimalScale={2} />
              <NumberInput label="Risk per trade (%)" value={riskPct} onChange={(v) => setRiskPct(num(v))} min={0.1} max={100} step={0.25} decimalScale={2} />
            </Group>
            <NumberInput label="Entry price" value={entry} onChange={(v) => setEntry(num(v))} min={0} thousandSeparator="," decimalScale={8} />
            <Group grow align="flex-start">
              <NumberInput label="Stop-loss price" value={stop} onChange={(v) => setStop(num(v))} min={0} thousandSeparator="," decimalScale={8} />
              <NumberInput
                label="Take-profit (optional)"
                value={takeProfit}
                onChange={(v) => setTakeProfit(v === "" ? "" : num(v))}
                min={0}
                thousandSeparator=","
                decimalScale={8}
              />
            </Group>
            <Stack gap={4} pb="md">
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  Leverage
                </Text>
                <Text size="sm" fw={700} ff="monospace">
                  {leverage}x
                </Text>
              </Group>
              <Slider value={leverage} onChange={setLeverage} min={1} max={100} step={1} marks={LEVERAGE_MARKS} label={(v) => `${v}x`} aria-label="Leverage" />
            </Stack>
          </Stack>
        </Paper>
      </GridCol>

      <GridCol span={{ base: 12, md: 6 }}>
        <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md" h="100%">
          <Stack gap="lg">
            {!result.valid ? (
              <Alert color="gray" variant="light" title="Check your inputs">
                {result.issues.map((issue) => (
                  <Text key={issue} size="sm">
                    {issue}
                  </Text>
                ))}
              </Alert>
            ) : (
              <>
                <Grid gap="lg">
                  <GridCol span={6}>
                    <Output
                      label="Position size"
                      value={formatPrice(result.positionUsd)}
                      color="brand"
                      hint={`${result.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 })} units`}
                    />
                  </GridCol>
                  <GridCol span={6}>
                    <Output label="Required margin" value={formatPrice(result.marginUsd)} hint={`At ${leverage}x leverage`} />
                  </GridCol>
                  <GridCol span={6}>
                    <Output
                      label="Liquidation price"
                      value={formatPrice(result.liquidationPrice)}
                      color={result.liquidatesBeforeStop ? "red" : undefined}
                      hint={`${result.liquidationDistancePct.toFixed(2)}% from entry`}
                    />
                  </GridCol>
                  <GridCol span={6}>
                    <Output
                      label="Max loss at stop"
                      value={formatPrice(result.lossAtStopUsd)}
                      color="red"
                      hint={`${riskPct}% of balance · stop ${result.stopDistancePct.toFixed(2)}% away`}
                    />
                  </GridCol>
                  <GridCol span={6}>
                    <Output
                      label="Risk : reward"
                      value={result.riskReward === null ? "—" : `1 : ${result.riskReward.toFixed(2)}`}
                      color={result.riskReward === null ? "dimmed" : result.riskReward >= 2 ? "teal" : result.riskReward >= 1 ? "yellow" : "red"}
                      hint={result.riskReward === null ? "Add a take-profit to see it" : undefined}
                    />
                  </GridCol>
                  <GridCol span={6}>
                    <Output
                      label="Profit at target"
                      value={result.profitAtTargetUsd === null ? "—" : formatPrice(result.profitAtTargetUsd)}
                      color={result.profitAtTargetUsd === null ? "dimmed" : "teal"}
                    />
                  </GridCol>
                </Grid>

                {result.liquidatesBeforeStop && (
                  <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} title="You would be liquidated before your stop">
                    At {leverage}x the liquidation price is closer than your stop-loss. Lower the leverage so the stop triggers first.
                  </Alert>
                )}
                {result.marginExceedsBalance && (
                  <Alert color="orange" variant="light" icon={<IconAlertTriangle size={18} />} title="Not enough balance for this margin">
                    This position needs at least {result.minLeverage}x leverage to fit your balance, or a wider stop / smaller risk.
                  </Alert>
                )}
                {riskPct > 2 && (
                  <Alert color="orange" variant="light">
                    Risking more than 2% per trade makes a losing streak very costly. Most professionals stay at 0.5–2%.
                  </Alert>
                )}

                <Text size="xs" c="dimmed">
                  Isolated margin estimate with a {(MAINTENANCE_MARGIN_RATE * 100).toFixed(1)}% maintenance margin, before fees and funding. Exchanges use
                  tiered maintenance rates, so check the exact liquidation price on your exchange.
                </Text>
              </>
            )}

            <Button
              component={Link}
              href="/academy/risk-management"
              variant="light"
              leftSection={<IconSchool size={16} />}
              rightSection={<IconArrowRight size={16} />}
              style={{ alignSelf: "flex-start" }}
            >
              Learn risk management in the Academy
            </Button>
          </Stack>
        </Paper>
      </GridCol>
    </Grid>
  );
}
