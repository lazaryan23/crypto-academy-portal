import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert, Container, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { AnchorLink } from "@/components/common/Links";
import { DerivativesTabs } from "@/components/derivatives/DerivativesTabs";
import { DerivativesDashboard } from "@/components/derivatives/DerivativesDashboard";
import { defaultOgImages, riskDisclaimer } from "@/config/site";
import { getDerivativesHistory } from "@/lib/derivatives-history";
import { getDerivativesOverview } from "@/lib/derivatives-market";

export const metadata: Metadata = {
  title: "Crypto Funding Rates & Open Interest — Binance, Bybit, OKX, Hyperliquid",
  description:
    "Live perpetual futures funding rates and open interest for the top cryptocurrencies across Binance, Bybit, OKX and Hyperliquid, with annualized rates, long/short ratios and 30-day history charts.",
  alternates: { canonical: "/derivatives" },
  openGraph: { url: "/derivatives", images: defaultOgImages },
};

const explainers = [
  {
    title: "Funding rate",
    text: "Perpetual futures never expire, so exchanges keep their price close to spot with periodic payments between traders. When funding is positive, longs pay shorts, a sign that traders are leaning bullish and paying up for leverage.",
  },
  {
    title: "Open interest",
    text: "The total value of futures positions still open. Rising open interest with a rising price means new leveraged money is chasing the move; a sharp drop in open interest usually means positions were closed or liquidated.",
  },
  {
    title: "Long/short ratio",
    text: "The share of accounts holding a net long versus a net short position. Very one-sided readings, especially combined with high funding, often come before a squeeze in the other direction.",
  },
];

async function DashboardLoader() {
  const [overview, history] = await Promise.all([getDerivativesOverview(), getDerivativesHistory("BTC", "7d")]);
  if (!overview.rows.length) {
    return (
      <Alert color="gray" variant="light" title="Derivatives data is temporarily unavailable">
        We couldn&apos;t reach the exchanges just now. This page refreshes automatically within a minute.
      </Alert>
    );
  }
  return <DerivativesDashboard initial={overview} initialHistory={history.status === "ok" ? history.data : null} />;
}

function DashboardSkeleton() {
  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} h={110} radius="md" />
        ))}
      </SimpleGrid>
      <Skeleton h={720} radius="md" />
      <Skeleton h={600} radius="md" />
    </Stack>
  );
}

export default function DerivativesPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="sm" maw={820}>
          <DerivativesTabs active="/derivatives" />
          <Title order={1} fz={{ base: 30, sm: 42 }} lh={1.15}>
            Funding rates &amp; open interest
          </Title>
          <Text c="dimmed" size="lg">
            Who is paying whom on perpetual futures right now, and how much leveraged money is in the market, across Binance, Bybit, OKX and Hyperliquid.
          </Text>
        </Stack>
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardLoader />
        </Suspense>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          {explainers.map((item) => (
            <Paper key={item.title} withBorder p="lg" radius="md">
              <Title order={2} size="h4" mb={6}>
                {item.title}
              </Title>
              <Text size="sm" c="dimmed">
                {item.text}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
        <Text size="xs" c="dimmed">
          Data from the public APIs of Binance, Bybit, OKX and Hyperliquid. Funding and open interest refresh every minute; history every few minutes. Learn the basics in{" "}
          <AnchorLink href="/academy/spot-vs-futures" size="xs">
            spot vs. futures
          </AnchorLink>
          . {riskDisclaimer}
        </Text>
      </Stack>
    </Container>
  );
}
