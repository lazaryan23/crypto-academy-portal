import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Grid, GridCol, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { AnchorLink } from "@/components/common/Links";
import { DerivativesTabs } from "@/components/derivatives/DerivativesTabs";
import { LiquidationsDashboard } from "@/components/liquidations/LiquidationsDashboard";
import { defaultOgImages, riskDisclaimer } from "@/config/site";
import { getLeverageMap } from "@/lib/leverage-map";
import { getLiquidationSetup, getRecentLiquidations } from "@/lib/liquidations";

export const metadata: Metadata = {
  title: "Crypto Liquidations — Live Feed and Estimated Liquidation Levels",
  description:
    "Live crypto futures liquidations streaming from Binance, Bybit and OKX, the last hour's long and short liquidations by coin, and an estimated liquidation level map for BTC, ETH, SOL, XRP and DOGE.",
  alternates: { canonical: "/liquidations" },
  openGraph: { url: "/liquidations", images: defaultOgImages },
};

const explainers = [
  {
    title: "What is a liquidation?",
    text: "When a leveraged trader's losses eat through their margin, the exchange force-closes the position. Longs are sold and shorts are bought back at market, which can push price further in the same direction.",
  },
  {
    title: "Why cascades happen",
    text: "Liquidations add selling into a drop or buying into a rally. If many positions share similar liquidation prices, one wave can trigger the next, producing the long wicks crypto is known for.",
  },
  {
    title: "How to use this",
    text: "Heavy long liquidations after a drop often mean leverage has been flushed out. Large clusters on the level map show where a move could accelerate, so they are worth knowing before you set stops or leverage.",
  },
];

async function DashboardLoader() {
  const [setup, recent, map] = await Promise.all([getLiquidationSetup(), getRecentLiquidations(), getLeverageMap("BTC")]);
  return <LiquidationsDashboard setup={setup} initialRecent={recent} initialMap={map} />;
}

function DashboardSkeleton() {
  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} h={120} radius="md" />
        ))}
      </SimpleGrid>
      <Grid gap="lg">
        <GridCol span={{ base: 12, lg: 8 }}>
          <Skeleton h={620} radius="md" />
        </GridCol>
        <GridCol span={{ base: 12, lg: 4 }}>
          <Skeleton h={620} radius="md" />
        </GridCol>
      </Grid>
      <Skeleton h={560} radius="md" />
    </Stack>
  );
}

export default function LiquidationsPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="sm" maw={820}>
          <DerivativesTabs active="/liquidations" />
          <Title order={1} fz={{ base: 30, sm: 42 }} lh={1.15}>
            Crypto liquidations
          </Title>
          <Text c="dimmed" size="lg">
            Leveraged positions being force-closed right now on Binance, Bybit and OKX, and the price levels where the next wave could hit.
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
          Live data from the public WebSocket feeds of Binance, Bybit and OKX; Binance sends at most one liquidation per contract per second, so its totals are a lower
          bound. Hourly totals come from OKX&apos;s public liquidation history. See also{" "}
          <AnchorLink href="/derivatives" size="xs">
            funding rates &amp; open interest
          </AnchorLink>{" "}
          and our guide to{" "}
          <AnchorLink href="/academy/understanding-leverage" size="xs">
            leverage &amp; margin
          </AnchorLink>
          . {riskDisclaimer}
        </Text>
      </Stack>
    </Container>
  );
}
