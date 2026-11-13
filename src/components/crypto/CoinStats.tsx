import { Card, Group, Progress, SimpleGrid, Stack, Text } from "@mantine/core";
import type { CoinDetail } from "@/types/coingecko";
import { formatCompactUsd, formatDate, formatPercent, formatPrice, formatSupply } from "@/lib/format";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card padding="md">
      <Text size="xs" c="dimmed" fw={600}>
        {label}
      </Text>
      <Text fw={700} ff="monospace" mt={4} size="lg">
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed" mt={2}>
          {hint}
        </Text>
      )}
    </Card>
  );
}

export function CoinStats({ coin }: { coin: CoinDetail }) {
  const m = coin.market_data;
  const price = m.current_price.usd;
  const high = m.high_24h.usd;
  const low = m.low_24h.usd;
  const rangePos = price != null && high != null && low != null && high > low ? ((price - low) / (high - low)) * 100 : 50;
  const supplyPct = m.circulating_supply && m.max_supply ? (m.circulating_supply / m.max_supply) * 100 : null;

  return (
    <Stack gap="md">
      <Card padding="md">
        <Group justify="space-between" mb={6}>
          <Text size="xs" c="dimmed" fw={600}>
            24h range
          </Text>
          <Text size="xs" c="dimmed">
            Low {formatPrice(low)} · High {formatPrice(high)}
          </Text>
        </Group>
        <Progress value={rangePos} color="brand" size="md" radius="xl" aria-label="Price position within 24h range" />
      </Card>
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Stat label="Market cap" value={formatCompactUsd(m.market_cap.usd)} hint={`Rank #${coin.market_cap_rank ?? "—"}`} />
        <Stat label="24h volume" value={formatCompactUsd(m.total_volume.usd)} />
        <Stat label="24h high" value={formatPrice(high)} />
        <Stat label="24h low" value={formatPrice(low)} />
        <Stat
          label="All-time high"
          value={formatPrice(m.ath.usd)}
          hint={`${formatPercent(m.ath_change_percentage.usd)} · ${formatDate(m.ath_date.usd)}`}
        />
        <Stat
          label="All-time low"
          value={formatPrice(m.atl.usd)}
          hint={`${formatPercent(m.atl_change_percentage.usd)} · ${formatDate(m.atl_date.usd)}`}
        />
        <Stat
          label="Circulating supply"
          value={formatSupply(m.circulating_supply, coin.symbol)}
          hint={supplyPct != null ? `${supplyPct.toFixed(1)}% of max supply` : undefined}
        />
        <Stat
          label="Max supply"
          value={m.max_supply ? formatSupply(m.max_supply, coin.symbol) : "Unlimited"}
          hint={`FDV ${formatCompactUsd(m.fully_diluted_valuation.usd)}`}
        />
      </SimpleGrid>
    </Stack>
  );
}
