import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert, Container, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { AnchorLink } from "@/components/common/Links";
import { DerivativesTabs } from "@/components/derivatives/DerivativesTabs";
import { OptionsDashboard } from "@/components/options/OptionsDashboard";
import { defaultOgImages, riskDisclaimer } from "@/config/site";
import { getOptionsOverview } from "@/lib/options";

export const metadata: Metadata = {
  title: "Bitcoin & Ethereum Options — Max Pain, Put/Call Ratio, Open Interest and DVOL",
  description:
    "Live Bitcoin and Ethereum options data from Deribit: max pain for every expiry, put/call ratio, open interest by strike, at-the-money implied volatility and the DVOL volatility index.",
  alternates: { canonical: "/options" },
  openGraph: { url: "/options", images: defaultOgImages },
};

const explainers = [
  {
    title: "Max pain",
    text: "The settlement price at which option buyers would lose the most and sellers keep the most premium. Price sometimes drifts toward it into a large expiry, but it is a tendency, not a target.",
  },
  {
    title: "Put/call ratio",
    text: "Open puts divided by open calls. Below 1 means more calls (bullish bets or upside hedges); above 1 means more puts, usually traders buying protection against a drop.",
  },
  {
    title: "Implied volatility",
    text: "How big a move options are pricing in. DVOL of 40 means the market expects roughly ±2% a day. Cheap volatility often comes before big moves; very high volatility usually comes with fear.",
  },
];

async function OptionsLoader() {
  const overview = await getOptionsOverview("BTC");
  if (!overview) {
    return (
      <Alert color="gray" variant="light" title="Options data is temporarily unavailable">
        We couldn&apos;t reach Deribit just now. This page refreshes automatically within a few minutes.
      </Alert>
    );
  }
  return <OptionsDashboard initial={overview} />;
}

function OptionsSkeleton() {
  return (
    <Stack gap="xl">
      <Skeleton h={36} w={120} radius="md" />
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} h={130} radius="md" />
        ))}
      </SimpleGrid>
      <Skeleton h={460} radius="md" />
      <Skeleton h={520} radius="md" />
    </Stack>
  );
}

export default function OptionsPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="sm" maw={820}>
          <DerivativesTabs active="/options" />
          <Title order={1} fz={{ base: 30, sm: 42 }} lh={1.15}>
            Bitcoin &amp; Ethereum options
          </Title>
          <Text c="dimmed" size="lg">
            Where options traders are positioned, the price that would hurt them most at each expiry, and how much volatility the market is pricing in.
          </Text>
        </Stack>
        <Suspense fallback={<OptionsSkeleton />}>
          <OptionsLoader />
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
          Data from Deribit&apos;s public API, the largest crypto options exchange, refreshed every few minutes. Open interest is in coins (one contract = one BTC or ETH),
          and notional values use the current index price. See also{" "}
          <AnchorLink href="/derivatives" size="xs">
            funding rates &amp; open interest
          </AnchorLink>{" "}
          and{" "}
          <AnchorLink href="/liquidations" size="xs">
            liquidations
          </AnchorLink>
          . {riskDisclaimer}
        </Text>
      </Stack>
    </Container>
  );
}
