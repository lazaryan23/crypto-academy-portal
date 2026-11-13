import type { Metadata } from "next";
import { AnchorLink } from "@/components/common/Links";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar, Badge, Breadcrumbs, Container, Group, Stack, Text, Title } from "@mantine/core";
import { getCoin, getMarketChart } from "@/lib/coingecko";
import { coinProfiles, popularCoinIds } from "@/content/coin-profiles";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/config/site";
import { PercentChange } from "@/components/common/PercentChange";
import { Disclaimer } from "@/components/common/Disclaimer";
import { CoinTradeWorkspace } from "@/components/crypto/CoinTradeWorkspace";
import { WatchlistButton } from "@/components/common/WatchlistButton";
import { DerivativesCard, DerivativesCardSkeleton } from "@/components/crypto/DerivativesCard";
import { CompareLinks } from "@/components/crypto/CompareLinks";
import { CoinStats } from "@/components/crypto/CoinStats";
import { CoinAbout } from "@/components/crypto/CoinAbout";
import { WhereToBuy } from "@/components/crypto/WhereToBuy";
import { CoinDetailSkeleton } from "@/components/crypto/CoinDetailSkeleton";

export function generateStaticParams() {
  return popularCoinIds.map((id) => ({ id }));
}

async function loadCoin(id: string) {
  const coin = await getCoin(id);
  if (!coin) notFound();
  return coin;
}

export async function generateMetadata({ params }: PageProps<"/crypto/[id]">): Promise<Metadata> {
  const { id } = await params;
  try {
    const coin = await getCoin(id);
    if (!coin) return { title: "Coin not found", robots: { index: false } };
    const symbol = coin.symbol.toUpperCase();
    const price = formatPrice(coin.market_data.current_price.usd);
    const title = `${coin.name} (${symbol}) Price Today, Live Chart & Market Cap`;
    const description = `${coin.name} price is ${price} USD. Live ${symbol} chart, all-time high, circulating supply, history and where to buy or trade ${symbol}.`;
    return {
      title,
      description,
      alternates: { canonical: `/crypto/${coin.id}` },
      openGraph: { title, description, url: `/crypto/${coin.id}`, images: [{ url: coin.image.large }] },
    };
  } catch {
    return { title: "Cryptocurrency price & chart", alternates: { canonical: `/crypto/${id}` } };
  }
}

async function CoinDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coin = await loadCoin(id);
  const initialPoints = await getMarketChart(coin.id, "1")
    .then((chart) => chart.prices)
    .catch(() => null);
  const symbol = coin.symbol.toUpperCase();
  const tvSymbol = `BINANCE:${coinProfiles[coin.id]?.tradingSymbol ?? symbol}USDT`;
  const m = coin.market_data;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Markets", item: `${siteConfig.url}/` },
      { "@type": "ListItem", position: 2, name: coin.name, item: `${siteConfig.url}/crypto/${coin.id}` },
    ],
  };

  return (
    <Stack gap="xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs>
        <AnchorLink href="/" size="sm">
          Markets
        </AnchorLink>
        <Text size="sm" c="dimmed">
          {coin.name}
        </Text>
      </Breadcrumbs>

      <Group justify="space-between" align="flex-end" gap="lg">
        <Group gap="md" wrap="nowrap">
          <Avatar src={coin.image.large} alt={coin.name} size={56} />
          <Stack gap={2}>
            <Group gap="xs">
              <Title order={1} fz={{ base: 26, sm: 34 }}>
                {coin.name}
              </Title>
              <Badge variant="light" color="gray">
                {symbol}
              </Badge>
              {coin.market_cap_rank && <Badge variant="light">Rank #{coin.market_cap_rank}</Badge>}
              <WatchlistButton coinId={coin.id} coinName={coin.name} size="lg" />
            </Group>
            <Text c="dimmed" size="sm">
              {coin.name} price in USD
            </Text>
          </Stack>
        </Group>
        <Stack gap={0} align="flex-end">
          <Text fz={{ base: 28, sm: 36 }} fw={800} ff="monospace">
            {formatPrice(m.current_price.usd)}
          </Text>
          <Group gap={6}>
            <PercentChange value={m.price_change_percentage_24h} size="md" />
            <Text size="sm" c="dimmed">
              24h
            </Text>
          </Group>
        </Stack>
      </Group>

      <CoinTradeWorkspace
        coinId={coin.id}
        coinName={coin.name}
        symbol={coin.symbol}
        price={m.current_price.usd}
        tradingViewSymbol={tvSymbol}
        initialPoints={initialPoints}
      />
      <Suspense fallback={<DerivativesCardSkeleton />}>
        <DerivativesCard symbol={coinProfiles[coin.id]?.tradingSymbol ?? coin.symbol} name={coin.name} />
      </Suspense>
      <CoinStats coin={coin} />
      <WhereToBuy name={coin.name} symbol={coin.symbol} />
      <CoinAbout coin={coin} />
      <CompareLinks coinId={coin.id} name={coin.name} />
      <Disclaimer />
    </Stack>
  );
}

export default function CoinPage({ params }: PageProps<"/crypto/[id]">) {
  return (
    <Container size="xl" py="xl">
      <Suspense fallback={<CoinDetailSkeleton />}>
        <CoinDetails params={params} />
      </Suspense>
    </Container>
  );
}
