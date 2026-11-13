import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, Container, List, ListItem, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { AnchorLink } from "@/components/common/Links";
import { Disclaimer } from "@/components/common/Disclaimer";
import { DcaTool, type DcaCoinOption } from "@/components/tools/DcaTool";
import { popularCoinIds } from "@/content/coin-profiles";
import { defaultOgImages } from "@/config/site";
import { getMarketChart, getMarkets } from "@/lib/coingecko";

export const metadata: Metadata = {
  title: "Crypto DCA Calculator — Backtest Weekly or Monthly Buys",
  description:
    "Backtest dollar-cost averaging into Bitcoin, Ethereum, Solana and other top cryptos. See what weekly or monthly buys over the last year would be worth today, and how DCA compares with a lump sum.",
  alternates: { canonical: "/tools/dca" },
  openGraph: { url: "/tools/dca", images: defaultOgImages },
};

async function DcaLoader() {
  const [coins, bitcoin] = await Promise.all([
    getMarkets({ ids: popularCoinIds, perPage: popularCoinIds.length }).catch(() => []),
    getMarketChart("bitcoin", "365").then((chart) => chart.prices).catch(() => null),
  ]);
  const options: DcaCoinOption[] = coins.length
    ? coins.map((coin) => ({ value: coin.id, label: `${coin.name} (${coin.symbol.toUpperCase()})`, name: coin.name, symbol: coin.symbol }))
    : [{ value: "bitcoin", label: "Bitcoin (BTC)", name: "Bitcoin", symbol: "btc" }];
  return <DcaTool options={options} initialPoints={bitcoin} />;
}

export default function DcaPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="sm" maw={780}>
          <Badge variant="light" size="lg" w="fit-content">
            Tool
          </Badge>
          <Title order={1} fz={{ base: 30, sm: 42 }} lh={1.15}>
            DCA backtester: what would regular buys be worth today?
          </Title>
          <Text c="dimmed" size="lg">
            Pick a coin and an amount to see how buying on a fixed schedule over the past year would have turned out, and how it compares with
            investing everything at once.
          </Text>
        </Stack>

        <Suspense fallback={<Skeleton h={640} radius="md" />}>
          <DcaLoader />
        </Suspense>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Paper withBorder p="lg">
            <Title order={2} size="h4" mb="sm">
              How dollar-cost averaging works
            </Title>
            <Text size="sm" mb="sm">
              Instead of trying to time the bottom, you invest the same amount on a schedule. You buy more coins when the price is low and fewer
              when it&apos;s high, so your average cost smooths out over time.
            </Text>
            <List size="sm" spacing={4}>
              <ListItem>It takes emotion and timing out of investing.</ListItem>
              <ListItem>It usually beats a lump sum in falling or choppy markets, and lags it in steadily rising ones.</ListItem>
              <ListItem>It works best with assets you plan to hold for years.</ListItem>
            </List>
          </Paper>
          <Paper withBorder p="lg">
            <Title order={2} size="h4" mb="sm">
              Build a long-term plan
            </Title>
            <Text size="sm" mb="sm">
              Our <AnchorLink href="/investing-guide">investing guide</AnchorLink> covers which coins to hold, how to split your portfolio by risk
              and when to rebalance. To see how two coins have performed against each other, try the{" "}
              <AnchorLink href="/compare">comparison tool</AnchorLink>.
            </Text>
          </Paper>
        </SimpleGrid>

        <Disclaimer />
      </Stack>
    </Container>
  );
}
