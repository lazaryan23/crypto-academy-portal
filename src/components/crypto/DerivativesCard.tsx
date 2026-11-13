import { Badge, Group, Paper, ProgressRoot, ProgressSection, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { IconArrowsExchange } from "@tabler/icons-react";
import { AnchorLink } from "@/components/common/Links";
import { getDerivatives, type DerivativesSnapshot } from "@/lib/derivatives";
import { formatCompactUsd } from "@/lib/format";

function fundingPercent(rate: number) {
  const pct = rate * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(4)}%`;
}

function fundingStory(data: DerivativesSnapshot) {
  const every = `every ${data.fundingIntervalHours}h`;
  const pct = Math.abs(data.fundingRate * 100).toFixed(4);
  const yearly = Math.abs(data.fundingRate * (24 / data.fundingIntervalHours) * 365 * 100).toFixed(1);
  if (data.fundingRate === 0) return { text: "Funding is flat: neither side is paying the other right now.", tone: "dimmed" };
  const longsPay = data.fundingRate > 0;
  const text = `${longsPay ? "Longs are paying shorts" : "Shorts are paying longs"} ${pct}% ${every} (about ${yearly}% a year if it stayed this way).`;
  const crowded = Math.abs(data.fundingRate) >= 0.0005;
  return {
    text: crowded ? `${text} That's unusually high: ${longsPay ? "longs" : "shorts"} look crowded.` : text,
    tone: crowded ? "orange" : longsPay ? "teal" : "red",
  };
}

function positioningStory(longPct: number, venue: string) {
  const side = longPct >= 50 ? "long" : "short";
  const share = Math.round(Math.max(longPct, 100 - longPct));
  const lopsided = share >= 65;
  return `${share}% of ${venue} accounts trading this contract are ${side}.${
    lopsided ? " When positioning is this one-sided, a sharp move the other way can trigger a wave of liquidations." : ""
  }`;
}

function nextFunding(timestamp: number | null) {
  if (!timestamp) return null;
  const time = new Date(timestamp).toISOString().slice(11, 16);
  return `Next payment at ${time} UTC`;
}

function Metric({ label, value, color, children }: { label: string; value: string; color?: string; children: React.ReactNode }) {
  return (
    <Stack gap={6}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.4}>
        {label}
      </Text>
      <Text fz={22} fw={700} ff="monospace" c={color}>
        {value}
      </Text>
      {children}
    </Stack>
  );
}

export function DerivativesCardSkeleton() {
  return <Skeleton height={230} radius="md" />;
}

export async function DerivativesCard({ symbol, name }: { symbol: string; name: string }) {
  const result = await getDerivatives(symbol);
  if (result.status === "unlisted") return null;

  const ticker = symbol.toUpperCase();

  if (result.status === "error") {
    return (
      <Paper withBorder p="lg">
        <Group gap="xs" mb={4}>
          <IconArrowsExchange size={20} />
          <Title order={2} size="h4">
            {ticker} derivatives
          </Title>
        </Group>
        <Text size="sm" c="dimmed">
          Futures data from Binance, Bybit and OKX is temporarily unavailable. It refreshes automatically.
        </Text>
      </Paper>
    );
  }

  const data = result.data;
  const funding = fundingStory(data);
  const when = nextFunding(data.nextFundingTime);

  return (
    <Paper withBorder p={{ base: "md", sm: "lg" }}>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" gap="xs">
          <Stack gap={4}>
            <Group gap="xs">
              <IconArrowsExchange size={22} color="var(--mantine-color-cyan-5)" />
              <Title order={2} size="h3">
                {ticker} derivatives
              </Title>
            </Group>
            <Text size="sm" c="dimmed">
              What futures traders are doing with {name} right now.
            </Text>
          </Stack>
          <Badge variant="light" color="gray">
            {data.source} · {data.contract}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
          <Metric label={`Funding rate (${data.fundingIntervalHours}h)`} value={fundingPercent(data.fundingRate)} color={funding.tone}>
            <Text size="sm">{funding.text}</Text>
            {when && (
              <Text size="xs" c="dimmed">
                {when}
              </Text>
            )}
          </Metric>

          <Metric label="Open interest" value={formatCompactUsd(data.openInterestUsd)}>
            <Text size="sm">
              {data.openInterestUsd === null
                ? "Open interest isn't available right now."
                : `The total value of ${ticker} futures positions still open on ${data.source}. Rising open interest means new money is entering with leverage.`}
            </Text>
          </Metric>

          <Metric
            label="Long / short accounts"
            value={data.longPct === null ? "—" : `${Math.round(data.longPct)}% / ${Math.round(100 - data.longPct)}%`}
          >
            {data.longPct === null ? (
              <Text size="sm">The long/short ratio isn&apos;t available for this contract.</Text>
            ) : (
              <>
                <ProgressRoot size="md" radius="xl" aria-label="Share of accounts long versus short">
                  <ProgressSection value={data.longPct} color="teal" />
                  <ProgressSection value={100 - data.longPct} color="red" />
                </ProgressRoot>
                <Text size="sm">{positioningStory(data.longPct, data.source)}</Text>
              </>
            )}
          </Metric>
        </SimpleGrid>

        <Text size="xs" c="dimmed">
          Perpetual futures data from {data.source}&apos;s public API, refreshed every couple of minutes. New to funding rates? Read{" "}
          <AnchorLink href="/academy/spot-vs-futures" size="xs">
            spot vs. futures
          </AnchorLink>
          .
        </Text>
      </Stack>
    </Paper>
  );
}
