"use client";

import { useMemo, useState } from "react";
import { ActionIcon, Alert, Badge, Button, Card, Group, NumberInput, Select, SimpleGrid, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconArrowsExchange } from "@tabler/icons-react";
import { RelativeTime } from "@/components/common/RelativeTime";

export interface ConverterCoin {
  id: string;
  symbol: string;
  name: string;
  price: number;
}

export interface ConverterFiat {
  code: string;
  name: string;
  perUsd: number;
}

type Side = "from" | "to";
type AssetKey = `coin:${string}` | `fiat:${string}`;

interface Asset {
  key: AssetKey;
  kind: "coin" | "fiat";
  code: string;
  label: string;
  usd: number;
}

const ZERO_DECIMAL_FIATS = new Set(["JPY", "KRW"]);
const QUICK_FIATS = ["USD", "EUR", "GBP", "AMD", "RUB"];
const QUICK_COINS = ["bitcoin", "ethereum"];

function formatAmount(asset: Asset, value: number) {
  if (!Number.isFinite(value)) return "—";
  if (asset.kind === "fiat") {
    const digits = ZERO_DECIMAL_FIATS.has(asset.code) ? 0 : 2;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: asset.code, currencyDisplay: "narrowSymbol", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  }
  const formatted =
    value >= 1 ? value.toLocaleString("en-US", { maximumFractionDigits: 6 }) : value === 0 ? "0" : Number(value.toPrecision(6)).toLocaleString("en-US", { maximumFractionDigits: 10 });
  return `${formatted} ${asset.code}`;
}

function decimalsFor(asset: Asset) {
  if (asset.kind === "fiat") return ZERO_DECIMAL_FIATS.has(asset.code) ? 0 : 2;
  return 8;
}

function presetsFor(asset: Asset) {
  if (asset.kind === "fiat") return [100, 500, 1000, 5000, 10000];
  if (asset.usd >= 1000) return [0.01, 0.05, 0.1, 0.5, 1];
  if (asset.usd >= 10) return [1, 5, 10, 50, 100];
  if (asset.usd >= 0.1) return [100, 500, 1000, 5000, 10000];
  return [10000, 100000, 1000000];
}

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function CryptoConverter({
  coins,
  fiats,
  ratesUpdatedAt,
  ratesAvailable,
}: {
  coins: ConverterCoin[];
  fiats: ConverterFiat[];
  ratesUpdatedAt: string | null;
  ratesAvailable: boolean;
}) {
  const assets = useMemo(() => {
    const map = new Map<AssetKey, Asset>();
    for (const fiat of fiats) map.set(`fiat:${fiat.code}`, { key: `fiat:${fiat.code}`, kind: "fiat", code: fiat.code, label: `${fiat.code} · ${fiat.name}`, usd: 1 / fiat.perUsd });
    for (const coin of coins) map.set(`coin:${coin.id}`, { key: `coin:${coin.id}`, kind: "coin", code: coin.symbol.toUpperCase(), label: `${coin.symbol.toUpperCase()} · ${coin.name}`, usd: coin.price });
    return map;
  }, [coins, fiats]);

  const selectData = useMemo(
    () => [
      { group: "Crypto", items: coins.map((coin) => ({ value: `coin:${coin.id}`, label: `${coin.symbol.toUpperCase()} · ${coin.name}` })) },
      { group: "Fiat currencies", items: fiats.map((fiat) => ({ value: `fiat:${fiat.code}`, label: `${fiat.code} · ${fiat.name}` })) },
    ],
    [coins, fiats],
  );

  const defaultFrom: AssetKey = assets.has("coin:bitcoin") ? "coin:bitcoin" : (coins[0] ? `coin:${coins[0].id}` : "fiat:USD");
  const [fromKey, setFromKey] = useState<AssetKey>(defaultFrom);
  const [toKey, setToKey] = useState<AssetKey>("fiat:USD");
  const [input, setInput] = useState<{ side: Side; value: number }>({ side: "from", value: 1 });

  const from = assets.get(fromKey);
  const to = assets.get(toKey);

  if (!from || !to) {
    return (
      <Alert color="gray" variant="light" title="Converter unavailable">
        Prices couldn&apos;t be loaded just now. Please try again in a minute.
      </Alert>
    );
  }

  const rate = from.usd / to.usd;
  const fromValue = input.side === "from" ? input.value : input.value / rate;
  const toValue = input.side === "to" ? input.value : input.value * rate;

  const swap = () => {
    setFromKey(toKey);
    setToKey(fromKey);
    setInput((prev) => ({ side: prev.side === "from" ? "to" : "from", value: prev.value }));
  };

  const select = (setter: (key: AssetKey) => void) => (value: string | null) => {
    if (value && assets.has(value as AssetKey)) setter(value as AssetKey);
  };

  const quickTargets = [...QUICK_FIATS.map((code) => `fiat:${code}` as AssetKey), ...QUICK_COINS.map((id) => `coin:${id}` as AssetKey)]
    .filter((key) => key !== fromKey && assets.has(key))
    .map((key) => assets.get(key) as Asset);

  return (
    <Card withBorder padding="lg" radius="md">
      <Stack gap="md">
        <Group justify="space-between" gap="xs">
          <Title order={2} size="h4">
            Crypto & currency converter
          </Title>
          <Badge variant="light" color="gray">
            1 {from.code} = {formatAmount(to, rate)}
          </Badge>
        </Group>

        {!ratesAvailable && (
          <Alert color="yellow" variant="light">
            Exchange rates are temporarily unavailable, so only USD and crypto conversions are shown.
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="xs" style={{ alignItems: "end" }}>
          <Select label="From" data={selectData} value={fromKey} onChange={select(setFromKey)} searchable allowDeselect={false} onFocus={(e) => e.currentTarget.select()} />
          <NumberInput
            aria-label={`Amount in ${from.code}`}
            value={roundTo(fromValue, decimalsFor(from))}
            onChange={(value) => setInput({ side: "from", value: Math.max(0, Number(value) || 0) })}
            min={0}
            thousandSeparator=","
            decimalScale={decimalsFor(from)}
            rightSection={<Text size="xs" c="dimmed">{from.code}</Text>}
            rightSectionWidth={56}
            size="md"
          />
        </SimpleGrid>

        <Group justify="center">
          <Tooltip label="Swap currencies" withArrow>
            <ActionIcon variant="light" size="lg" radius="xl" onClick={swap} aria-label="Swap from and to">
              <IconArrowsExchange size={18} style={{ transform: "rotate(90deg)" }} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="xs" style={{ alignItems: "end" }}>
          <Select label="To" data={selectData} value={toKey} onChange={select(setToKey)} searchable allowDeselect={false} onFocus={(e) => e.currentTarget.select()} />
          <NumberInput
            aria-label={`Amount in ${to.code}`}
            value={roundTo(toValue, decimalsFor(to))}
            onChange={(value) => setInput({ side: "to", value: Math.max(0, Number(value) || 0) })}
            min={0}
            thousandSeparator=","
            decimalScale={decimalsFor(to)}
            rightSection={<Text size="xs" c="dimmed">{to.code}</Text>}
            rightSectionWidth={56}
            size="md"
          />
        </SimpleGrid>

        <Group gap={6}>
          <Text size="xs" c="dimmed">
            Quick amounts:
          </Text>
          {presetsFor(from).map((preset) => (
            <Button key={preset} size="compact-xs" variant={input.side === "from" && input.value === preset ? "light" : "default"} onClick={() => setInput({ side: "from", value: preset })}>
              {preset.toLocaleString("en-US")} {from.code}
            </Button>
          ))}
        </Group>

        <Stack gap={6}>
          <Text size="sm" fw={600}>
            {formatAmount(from, fromValue)} is worth
          </Text>
          <SimpleGrid cols={{ base: 2, xs: 3, md: 4 }} spacing="xs">
            {quickTargets.map((target) => (
              <Card key={target.key} padding="xs" radius="sm" withBorder>
                <Text size="xs" c="dimmed">
                  {target.code}
                </Text>
                <Text size="sm" ff="monospace" fw={600} truncate>
                  {formatAmount(target, (fromValue * from.usd) / target.usd)}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>

        <Text size="xs" c="dimmed">
          Crypto prices from CoinGecko, refreshed every minute. Fiat rates by{" "}
          <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
            Exchange Rate API
          </a>
          {ratesUpdatedAt ? (
            <>
              , updated <RelativeTime iso={ratesUpdatedAt} />
            </>
          ) : null}
          . Indicative rates only; exchanges and banks add their own spreads and fees.
        </Text>
      </Stack>
    </Card>
  );
}
