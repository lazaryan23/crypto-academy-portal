import type { Metadata } from "next";
import { Suspense } from "react";
import { Avatar, Container, Group, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { CardLink } from "@/components/common/Links";
import { PairPicker } from "@/components/compare/PairPicker";
import { popularCoinIds } from "@/content/coin-profiles";
import { defaultOgImages } from "@/config/site";
import { getMarkets } from "@/lib/coingecko";
import { pairSlug, popularPairs } from "@/lib/pairs";
import type { CoinMarket } from "@/types/coingecko";

export const metadata: Metadata = {
  title: "Compare Cryptocurrencies Side by Side",
  description: "Compare any two cryptocurrencies: 1-year returns on one chart, market cap, volume, supply and all-time highs. Bitcoin vs Ethereum, Solana, XRP and more.",
  alternates: { canonical: "/compare" },
  openGraph: { url: "/compare", images: defaultOgImages },
};

async function PopularPairs() {
  const coins = await getMarkets({ ids: popularCoinIds, perPage: popularCoinIds.length }).catch(() => [] as CoinMarket[]);
  const byId = new Map(coins.map((coin) => [coin.id, coin]));
  const options = coins.map((coin) => ({ value: coin.id, label: `${coin.name} (${coin.symbol.toUpperCase()})` }));

  return (
    <Stack gap="xl">
      {options.length > 0 && <PairPicker options={options} />}
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
        {popularPairs.map(([a, b]) => {
          const ca = byId.get(a);
          const cb = byId.get(b);
          return (
            <CardLink key={pairSlug(a, b)} href={`/compare/${pairSlug(a, b)}`} withBorder padding="lg">
              <Group gap="sm" wrap="nowrap">
                <Group gap={0} wrap="nowrap">
                  <Avatar src={ca?.image} alt="" size={32} />
                  <Avatar src={cb?.image} alt="" size={32} ml={-10} style={{ border: "2px solid var(--mantine-color-body)" }} />
                </Group>
                <Stack gap={0}>
                  <Text fw={700}>
                    {ca?.name ?? a} vs {cb?.name ?? b}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {ca?.symbol.toUpperCase() ?? ""} · {cb?.symbol.toUpperCase() ?? ""}
                  </Text>
                </Stack>
              </Group>
            </CardLink>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}

export default function CompareIndexPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="sm" maw={760}>
          <Title order={1} fz={{ base: 30, sm: 42 }} lh={1.15}>
            Compare cryptocurrencies side by side
          </Title>
          <Text c="dimmed" size="lg">
            Put any two coins on one chart to see which performed better, then compare their size, supply and history.
          </Text>
        </Stack>
        <Suspense fallback={<Skeleton h={320} radius="md" />}>
          <PopularPairs />
        </Suspense>
      </Stack>
    </Container>
  );
}
