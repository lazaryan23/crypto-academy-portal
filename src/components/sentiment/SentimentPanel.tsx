import type { ReactNode } from "react";
import { Badge, Grid, GridCol, Group, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { IconGauge } from "@tabler/icons-react";
import { fearGreedColor, type FearGreed } from "@/lib/fear-greed";
import { formatCompactUsd, formatPercent } from "@/lib/format";
import { getMarketSentiment } from "@/lib/market-sentiment";
import { FearGreedGauge } from "./FearGreedGauge";

function ChangeBadge({ value, unit = "%" }: { value: number | null; unit?: "%" | "pp" }) {
  if (value == null) return null;
  const text = unit === "pp" ? `${value > 0 ? "+" : ""}${value.toFixed(2)} pp` : formatPercent(value);
  return (
    <Badge size="sm" variant="light" color={value >= 0 ? "teal" : "red"} ff="monospace">
      {text}
    </Badge>
  );
}

function Metric({ label, value, change, hint }: { label: string; value: string; change?: ReactNode; hint: string }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Group gap="xs" mt={6} align="baseline" wrap="wrap">
        <Text fw={800} size="xl" ff="monospace">
          {value}
        </Text>
        {change}
      </Group>
      <Text size="xs" c="dimmed" mt={4}>
        {hint}
      </Text>
    </Paper>
  );
}

function HistoryItem({ label, reading }: { label: string; reading: FearGreed | null }) {
  return (
    <Stack gap={0} align="center">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} ff="monospace" c={reading ? fearGreedColor(reading.value) : "dimmed"}>
        {reading?.value ?? "—"}
      </Text>
    </Stack>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <Stack gap="md" component="section" aria-labelledby="sentiment-title">
      <Group gap="xs">
        <IconGauge size={20} color="var(--mantine-color-brand-filled)" aria-hidden="true" />
        <Title order={2} size="h3" id="sentiment-title">
          Market sentiment
        </Title>
      </Group>
      {children}
    </Stack>
  );
}

export function SentimentPanelSkeleton() {
  return (
    <Shell>
      <Grid gap="md">
        <GridCol span={{ base: 12, md: 4 }}>
          <Skeleton h={232} radius="md" />
        </GridCol>
        <GridCol span={{ base: 12, md: 8 }}>
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} h={108} radius="md" />
            ))}
          </SimpleGrid>
        </GridCol>
      </Grid>
    </Shell>
  );
}

export async function SentimentPanel() {
  const s = await getMarketSentiment();
  const fg = s.fearGreed;

  return (
    <Shell>
      <Grid gap="md">
        <GridCol span={{ base: 12, md: 4 }}>
          <Paper withBorder p="md" radius="md" h="100%">
            <Group justify="space-between" mb="xs">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Fear &amp; Greed Index
              </Text>
              <Text size="xs" c="dimmed">
                alternative.me
              </Text>
            </Group>
            {fg ? (
              <>
                <FearGreedGauge value={fg.now.value} label={fg.now.label} />
                <Group justify="space-around" mt="xs">
                  <HistoryItem label="Yesterday" reading={fg.yesterday} />
                  <HistoryItem label="Last week" reading={fg.lastWeek} />
                  <HistoryItem label="Last month" reading={fg.lastMonth} />
                </Group>
              </>
            ) : (
              <Text size="sm" c="dimmed" py="xl" ta="center">
                Sentiment data is temporarily unavailable.
              </Text>
            )}
          </Paper>
        </GridCol>
        <GridCol span={{ base: 12, md: 8 }}>
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            <Metric
              label="Total market cap"
              value={formatCompactUsd(s.totalMarketCapUsd)}
              change={<ChangeBadge value={s.marketCapChange24h} />}
              hint="Combined value of all tracked crypto, 24h change."
            />
            <Metric
              label="24h volume"
              value={formatCompactUsd(s.totalVolumeUsd)}
              hint="Spot and derivatives trading volume reported to CoinGecko."
            />
            <Metric
              label="BTC dominance"
              value={s.btcDominance != null ? `${s.btcDominance.toFixed(2)}%` : "—"}
              change={<ChangeBadge value={s.btcDominanceChange24h} unit="pp" />}
              hint="Rising dominance usually means money rotating out of altcoins."
            />
            <Metric
              label="ETH dominance"
              value={s.ethDominance != null ? `${s.ethDominance.toFixed(2)}%` : "—"}
              change={<ChangeBadge value={s.ethDominanceChange24h} unit="pp" />}
              hint="Ethereum's share of the total market, 24h change in points."
            />
          </SimpleGrid>
        </GridCol>
      </Grid>
    </Shell>
  );
}
