import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, Container, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { CryptoConverter, type ConverterCoin, type ConverterFiat } from "@/components/tools/CryptoConverter";
import { GasTracker } from "@/components/tools/GasTracker";
import { defaultOgImages } from "@/config/site";
import { getTopMarkets } from "@/lib/coingecko";
import { getFiatRates } from "@/lib/network-fees";
import { getNetworkSnapshot } from "@/lib/network-snapshot";

export const metadata: Metadata = {
  title: "Gas Tracker & Crypto Converter — Live Bitcoin Fees, Ethereum Gas and Fiat Rates",
  description:
    "Live Bitcoin network fees in sat/vB and Ethereum gas in Gwei with the dollar cost of a transfer or swap, plus a converter between top cryptocurrencies and USD, EUR, GBP, AMD, RUB and more.",
  alternates: { canonical: "/tools/gas-converter" },
  openGraph: { url: "/tools/gas-converter", images: defaultOgImages },
};

const fiatNames: Record<string, string> = {
  USD: "US dollar",
  EUR: "Euro",
  GBP: "British pound",
  AMD: "Armenian dram",
  RUB: "Russian ruble",
  JPY: "Japanese yen",
  CNY: "Chinese yuan",
  INR: "Indian rupee",
  CAD: "Canadian dollar",
  AUD: "Australian dollar",
  CHF: "Swiss franc",
  KRW: "South Korean won",
  TRY: "Turkish lira",
  UAH: "Ukrainian hryvnia",
  GEL: "Georgian lari",
  AED: "UAE dirham",
  BRL: "Brazilian real",
};

async function GasLoader() {
  return <GasTracker initial={await getNetworkSnapshot()} />;
}

async function ConverterLoader() {
  const [markets, rates] = await Promise.all([getTopMarkets().catch(() => []), getFiatRates()]);
  const coins: ConverterCoin[] = markets
    .filter((coin) => coin.current_price !== null && coin.current_price > 0)
    .map((coin) => ({ id: coin.id, symbol: coin.symbol, name: coin.name, price: coin.current_price as number }));
  const fiats: ConverterFiat[] = rates
    ? Object.entries(fiatNames)
        .filter(([code]) => rates.rates[code])
        .map(([code, name]) => ({ code, name, perUsd: rates.rates[code] }))
    : [{ code: "USD", name: fiatNames.USD, perUsd: 1 }];
  return <CryptoConverter coins={coins} fiats={fiats} ratesUpdatedAt={rates?.updatedAt ?? null} ratesAvailable={rates !== null} />;
}

export default function GasConverterPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="sm" maw={780}>
          <Badge variant="light" size="lg" w="fit-content">
            Tool
          </Badge>
          <Title order={1} fz={{ base: 30, sm: 42 }} lh={1.15}>
            Gas tracker &amp; crypto converter
          </Title>
          <Text c="dimmed" size="lg">
            What it costs to send Bitcoin or Ethereum right now, and what your crypto is worth in dollars, euros, drams or any other coin.
          </Text>
        </Stack>
        <Suspense
          fallback={
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
              <Skeleton h={260} radius="md" />
              <Skeleton h={260} radius="md" />
            </SimpleGrid>
          }
        >
          <GasLoader />
        </Suspense>
        <Suspense fallback={<Skeleton h={520} radius="md" />}>
          <ConverterLoader />
        </Suspense>
      </Stack>
    </Container>
  );
}
