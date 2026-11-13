"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconAlertTriangle, IconExternalLink, IconRefresh, IconTarget, IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { AnchorLink } from "@/components/common/Links";
import { affiliateDisclosure, getExchanges } from "@/config/affiliates";
import { formatPrice, formatUsd } from "@/lib/format";
import { MAINTENANCE_MARGIN, planTrade, priceDecimals, riskLevel, roundPrice, type Side, type TradePlan } from "@/lib/trading";
import type { ChartLevel } from "./PriceChart";

const LIQUIDATION_FIT_RANGE = 0.1;
const defaultAccount = { account: 1000, riskPct: 1 };

function defaultsFor(side: Side, entry: number) {
  const long = side === "long";
  return {
    stop: roundPrice(entry * (long ? 0.98 : 1.02)),
    target: roundPrice(entry * (long ? 1.04 : 0.96)),
  };
}

export function useTradePlan(livePrice: number) {
  const [accountSettings, setAccountSettings] = useLocalStorage({ key: "coincompass:planner-account", defaultValue: defaultAccount });
  const [side, setSideState] = useState<Side>("long");
  const [entry, setEntry] = useState(() => roundPrice(livePrice));
  const [levels, setLevels] = useState(() => defaultsFor("long", roundPrice(livePrice)));
  const [leverage, setLeverage] = useState(5);
  const [showOnChart, setShowOnChart] = useState(true);

  const plan = planTrade({ side, ...accountSettings, entry, stop: levels.stop, target: levels.target, leverage });

  const setSide = useCallback(
    (next: Side) => {
      setSideState(next);
      setLevels(defaultsFor(next, entry));
    },
    [entry],
  );

  const resetToLivePrice = useCallback(() => {
    const price = roundPrice(livePrice);
    setEntry(price);
    setLevels(defaultsFor(side, price));
  }, [livePrice, side]);

  const chartLevels = useMemo<ChartLevel[]>(() => {
    if (!showOnChart || !plan.valid) return [];
    const result: ChartLevel[] = [
      { price: entry, title: "Entry", color: "#4dabf7" },
      { price: levels.stop, title: "Stop", color: "#fa5252" },
      { price: levels.target, title: "Target", color: "#12b886" },
    ];
    if (plan.liquidation !== null) {
      const near = Math.abs(plan.liquidation - entry) / entry <= LIQUIDATION_FIT_RANGE;
      result.push({ price: plan.liquidation, title: "Liquidation", color: "#fd7e14", dashed: true, fitToScale: near });
    }
    return result;
  }, [showOnChart, plan.valid, plan.liquidation, entry, levels.stop, levels.target]);

  return {
    side,
    setSide,
    entry,
    setEntry,
    stop: levels.stop,
    setStop: (stop: number) => setLevels((prev) => ({ ...prev, stop })),
    target: levels.target,
    setTarget: (target: number) => setLevels((prev) => ({ ...prev, target })),
    leverage,
    setLeverage,
    account: accountSettings.account,
    setAccount: (account: number) => setAccountSettings((prev) => ({ ...prev, account })),
    riskPct: accountSettings.riskPct,
    setRiskPct: (riskPct: number) => setAccountSettings((prev) => ({ ...prev, riskPct })),
    showOnChart,
    setShowOnChart,
    resetToLivePrice,
    plan,
    chartLevels,
  };
}

export type TradePlanState = ReturnType<typeof useTradePlan>;

function Stat({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} ff="monospace" c={color}>
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

function distanceHint(price: number, entry: number) {
  if (entry <= 0 || price <= 0) return undefined;
  const pct = ((price - entry) / entry) * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(2)}% from entry`;
}

function Warnings({ plan, leverage, riskPct }: { plan: TradePlan; leverage: number; riskPct: number }) {
  const safeLeverage = plan.stopDistance > 0 ? Math.max(1, Math.floor(1 / (plan.stopDistance * 2))) : leverage;
  return (
    <>
      {plan.liquidatesBeforeStop && (
        <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} title="You'd be liquidated before your stop">
          At {leverage}x the liquidation price ({formatPrice(plan.liquidation)}) comes before your stop-loss. Lower leverage to about {safeLeverage}x
          or less, or move the stop closer to your entry.
        </Alert>
      )}
      {!plan.liquidatesBeforeStop && plan.marginExceedsAccount && (
        <Alert color="orange" variant="light" title="Not enough margin">
          This position needs {formatUsd(plan.margin)} of margin, more than your account. Reduce your risk or widen the stop rather than reaching for
          more leverage.
        </Alert>
      )}
      {riskPct > 2 && (
        <Alert color="orange" variant="light">
          Risking more than 2% per trade makes a losing streak very costly. Most professionals stay at 0.5–2%.
        </Alert>
      )}
      {plan.rewardRisk > 0 && plan.rewardRisk < 1 && (
        <Alert color="yellow" variant="light">
          Your potential reward is smaller than your risk (1 : {plan.rewardRisk.toFixed(2)}). You&apos;d need to win most of these trades just to
          break even.
        </Alert>
      )}
    </>
  );
}

export function TradePlanner({
  coinName,
  symbol,
  state,
  onInteract,
}: {
  coinName: string;
  symbol: string;
  state: TradePlanState;
  onInteract: () => void;
}) {
  const { plan, side, entry, stop, target, leverage, account, riskPct } = state;
  const decimals = priceDecimals(entry || 1);
  const risk = riskLevel(leverage);
  const ticker = symbol.toUpperCase();
  const exchanges = getExchanges(["bybit", "binance"]);

  const edit =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      onInteract();
    };
  const num = (setter: (value: number) => void) => edit((value: number | string) => setter(Number(value) || 0));

  return (
    <Paper withBorder p={{ base: "md", sm: "lg" }} id="trade-planner">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Stack gap={4} maw={620}>
            <Group gap="xs">
              <IconTarget size={22} color="var(--mantine-color-cyan-5)" />
              <Title order={2} size="h3">
                {ticker} trade planner
              </Title>
            </Group>
            <Text size="sm" c="dimmed">
              Plan a {coinName} trade before you place it: size the position from the amount you&apos;re willing to lose, then check the stop, target
              and liquidation price on the chart.
            </Text>
          </Stack>
          <Switch
            label="Show on chart"
            checked={state.showOnChart}
            onChange={(e) => edit(state.setShowOnChart)(e.currentTarget.checked)}
          />
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
          <Stack gap="md">
            <SegmentedControl
              fullWidth
              value={side}
              onChange={(value) => edit(state.setSide)(value as Side)}
              color={side === "long" ? "teal" : "red"}
              data={[
                {
                  value: "long",
                  label: (
                    <Group gap={6} justify="center" wrap="nowrap">
                      <IconTrendingUp size={16} />
                      Long
                    </Group>
                  ),
                },
                {
                  value: "short",
                  label: (
                    <Group gap={6} justify="center" wrap="nowrap">
                      <IconTrendingDown size={16} />
                      Short
                    </Group>
                  ),
                },
              ]}
              aria-label="Trade direction"
            />
            <SimpleGrid cols={2} spacing="sm">
              <NumberInput label="Account size (USDT)" value={account} onChange={num(state.setAccount)} min={0} thousandSeparator="," />
              <NumberInput
                label="Risk per trade (%)"
                value={riskPct}
                onChange={num(state.setRiskPct)}
                min={0.1}
                max={100}
                step={0.25}
                decimalScale={2}
              />
            </SimpleGrid>
            <NumberInput
              label="Entry price"
              value={entry}
              onChange={num(state.setEntry)}
              min={0}
              thousandSeparator=","
              decimalScale={decimals}
              rightSectionWidth={36}
              rightSection={
                <Tooltip label="Reset to live price" withArrow>
                  <ActionIcon variant="subtle" aria-label="Reset entry to live price" onClick={edit(state.resetToLivePrice)}>
                    <IconRefresh size={16} />
                  </ActionIcon>
                </Tooltip>
              }
            />
            <SimpleGrid cols={2} spacing="sm">
              <NumberInput
                label="Stop-loss"
                description={distanceHint(stop, entry)}
                value={stop}
                onChange={num(state.setStop)}
                min={0}
                thousandSeparator=","
                decimalScale={decimals}
              />
              <NumberInput
                label="Take-profit"
                description={distanceHint(target, entry)}
                value={target}
                onChange={num(state.setTarget)}
                min={0}
                thousandSeparator=","
                decimalScale={decimals}
              />
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
                onChange={edit(state.setLeverage)}
                min={1}
                max={50}
                color={risk.color}
                marks={[1, 5, 10, 25, 50].map((value) => ({ value, label: `${value}x` }))}
                mb="lg"
                aria-label="Leverage"
              />
            </Stack>
          </Stack>

          <Stack gap="md">
            {plan.problem ? (
              <Alert color="gray" variant="light">
                {plan.problem}
              </Alert>
            ) : (
              <>
                <SimpleGrid cols={{ base: 2, xs: 3 }} spacing="md" verticalSpacing="md">
                  <Stat label="Position size" value={formatUsd(plan.positionSize)} hint={`${plan.quantity.toPrecision(4)} ${ticker}`} />
                  <Stat label="Margin needed" value={formatUsd(plan.margin)} hint={`at ${leverage}x`} />
                  <Stat label="Reward : risk" value={`1 : ${plan.rewardRisk.toFixed(2)}`} color={plan.rewardRisk >= 2 ? "teal" : undefined} />
                  <Stat label="Loss if stopped" value={`-${formatUsd(plan.riskAmount)}`} hint={`${riskPct}% of account`} color="red" />
                  <Stat label="Profit at target" value={`+${formatUsd(plan.profitAtTarget)}`} hint="before fees" color="teal" />
                  <Stat
                    label="Est. liquidation"
                    value={plan.liquidation === null ? "None at 1x" : formatPrice(plan.liquidation)}
                    hint={plan.liquidation === null ? undefined : distanceHint(plan.liquidation, entry)}
                    color="orange"
                  />
                </SimpleGrid>
                <Warnings plan={plan} leverage={leverage} riskPct={riskPct} />
              </>
            )}

            <Stack gap="xs" mt="auto">
              <Text size="sm" fw={600}>
                Ready to place it?
              </Text>
              <Group gap="sm">
                {exchanges.map((exchange) => (
                  <Button
                    key={exchange.id}
                    component="a"
                    href={exchange.referralUrl}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    color={exchange.color}
                    variant="light"
                    rightSection={<IconExternalLink size={14} />}
                  >
                    Trade {ticker} on {exchange.name}
                  </Button>
                ))}
              </Group>
              <Text size="xs" c="dimmed">
                New to futures? Read{" "}
                <AnchorLink href="/academy/risk-management" size="xs">
                  how to avoid liquidation
                </AnchorLink>{" "}
                first.
              </Text>
            </Stack>
          </Stack>
        </SimpleGrid>

        <Text size="xs" c="dimmed">
          Estimates assume isolated margin with {MAINTENANCE_MARGIN * 100}% maintenance margin and exclude fees, funding and slippage. Educational
          tool, not financial advice. {affiliateDisclosure}
        </Text>
      </Stack>
    </Paper>
  );
}
