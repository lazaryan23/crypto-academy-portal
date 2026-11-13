import type { Metadata } from "next";
import { Suspense } from "react";
import { Code, Container, List, ListItem, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { AnchorLink } from "@/components/common/Links";
import { Disclaimer } from "@/components/common/Disclaimer";
import { ProfitCalculator, type CalculatorCoin } from "@/components/tools/ProfitCalculator";
import { popularCoinIds } from "@/content/coin-profiles";
import { defaultOgImages } from "@/config/site";
import { getMarkets } from "@/lib/coingecko";

export const metadata: Metadata = {
  title: "Crypto Profit & Tax Calculator — Profit, Loss and ROI After Fees",
  description:
    "Calculate your crypto profit or loss and ROI after buying and selling fees. Works for full and partial sells, shows your break-even price and an optional tax estimate.",
  alternates: { canonical: "/tools/calculator" },
  openGraph: { url: "/tools/calculator", images: defaultOgImages },
};

async function CalculatorLoader() {
  const markets = await getMarkets({ ids: popularCoinIds, perPage: popularCoinIds.length }).catch(() => []);
  const coins: CalculatorCoin[] = markets.map((coin) => ({
    value: coin.id,
    label: `${coin.name} (${coin.symbol.toUpperCase()})`,
    symbol: coin.symbol,
    price: coin.current_price,
  }));
  return <ProfitCalculator coins={coins} />;
}

function CalculatorSkeleton() {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
      <Skeleton h={640} radius="md" />
      <Skeleton h={420} radius="md" />
    </SimpleGrid>
  );
}

export default function CalculatorPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="sm" maw={780}>
          <Title order={1} fz={{ base: 30, sm: 42 }} lh={1.15}>
            Crypto profit &amp; tax calculator
          </Title>
          <Text c="dimmed" size="lg">
            Work out what a trade really made you after fees: total cost, revenue, net profit or loss and ROI, plus an optional tax estimate.
          </Text>
        </Stack>

        <Suspense fallback={<CalculatorSkeleton />}>
          <CalculatorLoader />
        </Suspense>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Paper withBorder p="lg">
            <Title order={2} size="h4" mb="sm">
              How it&apos;s calculated
            </Title>
            <List size="sm" spacing={6}>
              <ListItem>
                <Code>Total cost = buy price × quantity + buying fee</Code>
              </ListItem>
              <ListItem>
                <Code>Total revenue = sell price × quantity sold − selling fee</Code>
              </ListItem>
              <ListItem>
                <Code>Net profit = total revenue − cost of the coins sold</Code>
              </ListItem>
              <ListItem>
                <Code>ROI = net profit ÷ cost of the coins sold × 100</Code>
              </ListItem>
            </List>
            <Text size="sm" c="dimmed" mt="sm">
              When you sell only part of a position, the cost of the coins sold is that share of your total cost, including the buying fee.
            </Text>
          </Paper>
          <Paper withBorder p="lg">
            <Title order={2} size="h4" mb="sm">
              About the tax estimate
            </Title>
            <Text size="sm" mb="sm">
              The estimate applies your rate to a gain only, so a loss shows no tax. Real tax rules differ a lot between countries: many tax
              short-term and long-term gains differently, let losses offset gains, or treat each trade, swap or payment as a taxable event.
            </Text>
            <Text size="sm">
              Keep a record of every trade and check with a tax professional. To plan regular buys instead, try the{" "}
              <AnchorLink href="/tools/dca">DCA backtester</AnchorLink>.
            </Text>
          </Paper>
        </SimpleGrid>

        <Disclaimer />
      </Stack>
    </Container>
  );
}
