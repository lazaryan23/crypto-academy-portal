"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconRefresh, IconRotate } from "@tabler/icons-react";
import { calculateProfit, type Fee, type FeeType } from "@/lib/profit";
import { formatPercent, formatPrice, formatUsd } from "@/lib/format";
import { priceDecimals, roundPrice } from "@/lib/trading";

export interface CalculatorCoin {
  value: string;
  label: string;
  symbol: string;
  price: number | null;
}

type Mode = "sold" | "holding";

const CUSTOM = "custom";
const DEFAULT_FEE: Fee = { type: "percent", value: 0.1 };
const FALLBACK_PRICE = 60_000;

function examplePrices(price: number | null) {
  const current = price && price > 0 ? price : FALLBACK_PRICE;
  return { buy: roundPrice(current * 0.85), sell: roundPrice(current) };
}

function toNumber(value: string | number) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function FeeInput({ label, fee, onChange }: { label: string; fee: Fee; onChange: (fee: Fee) => void }) {
  return (
    <NumberInput
      label={label}
      value={fee.value}
      onChange={(value) => onChange({ ...fee, value: Math.max(0, toNumber(value)) })}
      min={0}
      max={fee.type === "percent" ? 99.99 : undefined}
      step={fee.type === "percent" ? 0.05 : 1}
      decimalScale={fee.type === "percent" ? 3 : 2}
      thousandSeparator=","
      prefix={fee.type === "flat" ? "$" : undefined}
      suffix={fee.type === "percent" ? "%" : undefined}
      rightSectionWidth={84}
      rightSection={
        <SegmentedControl
          size="xs"
          value={fee.type}
          onChange={(type) => onChange({ type: type as FeeType, value: 0 })}
          data={[
            { value: "percent", label: "%" },
            { value: "flat", label: "$" },
          ]}
          aria-label={`${label} type`}
        />
      }
    />
  );
}

function Line({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <Text size="sm" c={strong ? undefined : "dimmed"} fw={strong ? 600 : undefined}>
        {label}
      </Text>
      <Text size="sm" ff="monospace" fw={strong ? 700 : 500} c={color} ta="right">
        {value}
      </Text>
    </Group>
  );
}

function Stat({ label, value, hint, color }: { label: string; value: string; hint?: ReactNode; color?: string }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text fz={20} fw={700} ff="monospace" c={color}>
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

export function ProfitCalculator({ coins }: { coins: CalculatorCoin[] }) {
  const firstCoin = coins[0] ?? null;
  const initialPrices = examplePrices(firstCoin?.price ?? null);

  const [coinId, setCoinId] = useState<string>(firstCoin?.value ?? CUSTOM);
  const [customTicker, setCustomTicker] = useState("");
  const [mode, setMode] = useState<Mode>("sold");
  const [buyPrice, setBuyPrice] = useState(initialPrices.buy);
  const [buyQuantity, setBuyQuantity] = useState(0.1);
  const [sellPrice, setSellPrice] = useState(initialPrices.sell);
  const [sellQuantity, setSellQuantity] = useState<number | null>(null);
  const [buyFee, setBuyFee] = useState<Fee>(DEFAULT_FEE);
  const [sellFee, setSellFee] = useState<Fee>(DEFAULT_FEE);
  const [taxRate, setTaxRate] = useState(0);

  const coin = coins.find((c) => c.value === coinId) ?? null;
  const ticker = coin ? coin.symbol.toUpperCase() : customTicker.trim().toUpperCase() || "coins";
  const quantitySold = sellQuantity ?? buyQuantity;
  const holding = mode === "holding";
  const decimals = priceDecimals(Math.max(buyPrice, sellPrice, 0.0001));

  const outcome = useMemo(
    () => calculateProfit({ buyPrice, buyQuantity, sellPrice, sellQuantity: quantitySold, buyFee, sellFee, taxRate }),
    [buyPrice, buyQuantity, sellPrice, quantitySold, buyFee, sellFee, taxRate],
  );

  const selectCoin = (value: string | null) => {
    if (!value) return;
    setCoinId(value);
    const next = coins.find((c) => c.value === value);
    if (next?.price) {
      const prices = examplePrices(next.price);
      setBuyPrice(prices.buy);
      setSellPrice(prices.sell);
    }
  };

  const reset = () => {
    const prices = examplePrices(coin?.price ?? null);
    setMode("sold");
    setBuyPrice(prices.buy);
    setBuyQuantity(0.1);
    setSellPrice(prices.sell);
    setSellQuantity(null);
    setBuyFee(DEFAULT_FEE);
    setSellFee(DEFAULT_FEE);
    setTaxRate(0);
  };

  const result = outcome.ok ? outcome.result : null;
  const profit = result ? result.netProfit >= 0 : true;
  const resultColor = result ? (result.netProfit > 0 ? "teal" : result.netProfit < 0 ? "red" : undefined) : undefined;
  const partial = result !== null && result.remainingQuantity > 1e-12;

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
      <Paper withBorder p={{ base: "md", sm: "lg" }}>
        <Stack gap="md">
          <Group justify="space-between" gap="sm">
            <Title order={2} size="h4">
              Your trade
            </Title>
            <Button variant="subtle" size="compact-sm" leftSection={<IconRotate size={14} />} onClick={reset}>
              Reset
            </Button>
          </Group>

          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
            <Select
              label="Coin"
              data={[...coins.map(({ value, label }) => ({ value, label })), { value: CUSTOM, label: "Other coin…" }]}
              value={coinId}
              onChange={selectCoin}
              onFocus={(e) => e.currentTarget.select()}
              searchable
              allowDeselect={false}
            />
            {coinId === CUSTOM ? (
              <TextInput
                label="Ticker"
                placeholder="e.g. LINK"
                value={customTicker}
                onChange={(e) => setCustomTicker(e.currentTarget.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12))}
              />
            ) : (
              <Stack gap={4}>
                <Text size="sm" fw={500}>
                  Position
                </Text>
                <SegmentedControl
                  fullWidth
                  value={mode}
                  onChange={(value) => setMode(value as Mode)}
                  data={[
                    { value: "sold", label: "Sold" },
                    { value: "holding", label: "Still holding" },
                  ]}
                  aria-label="Position status"
                />
              </Stack>
            )}
          </SimpleGrid>
          {coinId === CUSTOM && (
            <SegmentedControl
              fullWidth
              value={mode}
              onChange={(value) => setMode(value as Mode)}
              data={[
                { value: "sold", label: "Sold" },
                { value: "holding", label: "Still holding" },
              ]}
              aria-label="Position status"
            />
          )}

          <Divider label="Buy" labelPosition="left" />
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
            <NumberInput
              label="Purchase price (per coin)"
              value={buyPrice}
              onChange={(value) => setBuyPrice(Math.max(0, toNumber(value)))}
              min={0}
              prefix="$"
              thousandSeparator=","
              decimalScale={decimals}
            />
            <NumberInput
              label="Quantity purchased"
              value={buyQuantity}
              onChange={(value) => setBuyQuantity(Math.max(0, toNumber(value)))}
              min={0}
              thousandSeparator=","
              decimalScale={8}
              suffix={` ${ticker}`}
            />
          </SimpleGrid>
          <FeeInput label="Buying fee" fee={buyFee} onChange={setBuyFee} />

          <Divider label={holding ? "Value today" : "Sell"} labelPosition="left" />
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
            <NumberInput
              label={holding ? "Current price (per coin)" : "Selling price (per coin)"}
              value={sellPrice}
              onChange={(value) => setSellPrice(Math.max(0, toNumber(value)))}
              min={0}
              prefix="$"
              thousandSeparator=","
              decimalScale={decimals}
              rightSectionWidth={36}
              rightSection={
                coin?.price ? (
                  <Tooltip label={`Use live ${ticker} price`} withArrow>
                    <ActionIcon variant="subtle" aria-label="Use live price" onClick={() => setSellPrice(roundPrice(coin.price ?? 0))}>
                      <IconRefresh size={16} />
                    </ActionIcon>
                  </Tooltip>
                ) : null
              }
            />
            <NumberInput
              label={holding ? "Quantity to value" : "Quantity sold"}
              value={quantitySold}
              onChange={(value) => setSellQuantity(Math.max(0, toNumber(value)))}
              min={0}
              max={buyQuantity}
              thousandSeparator=","
              decimalScale={8}
              suffix={` ${ticker}`}
              description={
                sellQuantity !== null && sellQuantity !== buyQuantity ? (
                  <Text component="span" size="xs" c="blue" style={{ cursor: "pointer" }} onClick={() => setSellQuantity(null)}>
                    Use the full {buyQuantity} {ticker}
                  </Text>
                ) : undefined
              }
            />
          </SimpleGrid>
          <FeeInput label={holding ? "Selling fee (when you sell)" : "Selling fee"} fee={sellFee} onChange={setSellFee} />

          <Divider label="Tax (optional)" labelPosition="left" />
          <NumberInput
            label="Your tax rate on gains"
            description="Leave at 0% to skip. Rates depend on your country, income and how long you held."
            value={taxRate}
            onChange={(value) => setTaxRate(Math.min(100, Math.max(0, toNumber(value))))}
            min={0}
            max={100}
            step={1}
            decimalScale={2}
            suffix="%"
          />
        </Stack>
      </Paper>

      <Stack gap="lg">
        <Paper withBorder p={{ base: "md", sm: "lg" }} aria-live="polite">
          {!result ? (
            <Alert color="gray" variant="light" title="Can't calculate yet">
              {outcome.ok ? null : outcome.problem}
            </Alert>
          ) : (
            <Stack gap="lg">
              <Stack gap={4}>
                <Group gap="xs">
                  <Text size="sm" c="dimmed" fw={600} tt="uppercase">
                    {holding ? "Unrealized" : "Net"} {profit ? "profit" : "loss"}
                  </Text>
                  <Badge color={resultColor ?? "gray"} variant="light">
                    {formatPercent(result.roi)} ROI
                  </Badge>
                </Group>
                <Text fz={{ base: 34, sm: 42 }} fw={800} ff="monospace" c={resultColor} lh={1.1}>
                  {result.netProfit >= 0 ? "+" : "-"}
                  {formatUsd(Math.abs(result.netProfit))}
                </Text>
                <Text size="sm" c="dimmed">
                  {holding ? "If you sold" : "Selling"} {quantitySold} {ticker} at {formatPrice(sellPrice)} after buying at {formatPrice(buyPrice)}.
                </Text>
              </Stack>

              <SimpleGrid cols={2} spacing="lg">
                <Stat label="Total cost" value={formatUsd(result.soldCostBasis)} hint={partial ? `of ${formatUsd(result.totalCost)} total, incl. fees` : "incl. buying fee"} />
                <Stat label={holding ? "Value after fees" : "Total revenue"} value={formatUsd(result.totalRevenue)} hint="after selling fee" />
                <Stat
                  label="Break-even price"
                  value={result.breakEvenPrice === null ? "—" : formatPrice(result.breakEvenPrice)}
                  hint="per coin, covering both fees"
                />
                <Stat label="Fees paid" value={formatUsd(result.buyFeeAmount * (quantitySold / buyQuantity) + result.sellFeeAmount)} hint="on these coins" />
              </SimpleGrid>

              {taxRate > 0 && (
                <SimpleGrid cols={2} spacing="lg">
                  <Stat label="Estimated tax" value={formatUsd(result.estimatedTax)} hint={result.netProfit > 0 ? `${taxRate}% of the gain` : "No tax on a loss"} />
                  <Stat label="Profit after tax" value={formatUsd(result.profitAfterTax)} color={resultColor} />
                </SimpleGrid>
              )}

              {partial && (
                <Alert color="blue" variant="light">
                  You still hold {Number(result.remainingQuantity.toFixed(8))} {ticker} with a cost basis of {formatUsd(result.remainingCostBasis)} (
                  {formatPrice(result.costPerCoin)} per coin including the buying fee).
                </Alert>
              )}
            </Stack>
          )}
        </Paper>

        {result && (
          <Paper withBorder p={{ base: "md", sm: "lg" }}>
            <Stack gap={8}>
              <Title order={3} size="h5">
                How it adds up
              </Title>
              <Line label={`Bought ${buyQuantity} ${ticker} × ${formatPrice(buyPrice)}`} value={formatUsd(result.buyValue)} />
              <Line label="+ Buying fee" value={formatUsd(result.buyFeeAmount)} />
              <Line label="Total cost" value={formatUsd(result.totalCost)} strong />
              {partial && <Line label={`Cost of the ${quantitySold} ${ticker} sold`} value={formatUsd(result.soldCostBasis)} />}
              <Divider my={4} />
              <Line label={`${holding ? "Valued" : "Sold"} ${quantitySold} ${ticker} × ${formatPrice(sellPrice)}`} value={formatUsd(result.sellValue)} />
              <Line label="− Selling fee" value={formatUsd(result.sellFeeAmount)} />
              <Line label={holding ? "Value after fees" : "Total revenue"} value={formatUsd(result.totalRevenue)} strong />
              <Divider my={4} />
              <Line
                label={holding ? "Unrealized profit / loss" : "Net profit / loss"}
                value={`${result.netProfit >= 0 ? "+" : "-"}${formatUsd(Math.abs(result.netProfit))}`}
                strong
                color={resultColor}
              />
            </Stack>
          </Paper>
        )}
      </Stack>
    </SimpleGrid>
  );
}
