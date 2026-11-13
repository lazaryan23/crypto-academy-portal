import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert, Container, Skeleton, Stack, Text, Title } from "@mantine/core";
import { MarketHeatmap, type HeatmapCoin } from "@/components/heatmap/MarketHeatmap";
import { defaultOgImages } from "@/config/site";
import { getTopMarkets } from "@/lib/coingecko";
import type { CoinMarket } from "@/types/coingecko";

export const metadata: Metadata = {
  title: "Crypto Heatmap — Top 100 Coins by Market Cap and Performance",
  description:
    "See the whole crypto market at a glance: the top 100 coins sized by market cap or 24h volume and colored by their 1h, 24h or 7d price change.",
  alternates: { canonical: "/heatmap" },
  openGraph: { url: "/heatmap", images: defaultOgImages },
};

const stablecoinSymbols = new Set([
  "usdt", "usdc", "dai", "fdusd", "usde", "usds", "susde", "susds", "tusd", "pyusd", "usd1", "rlusd", "usdd", "gho", "frax", "usdx", "usdg", "usdf", "bfusd", "eurc", "usdtb", "busd", "usdp", "lusd", "crvusd",
]);

function isStablecoin(coin: CoinMarket) {
  if (stablecoinSymbols.has(coin.symbol.toLowerCase())) return true;
  return /usd/i.test(coin.symbol) && coin.current_price !== null && Math.abs(coin.current_price - 1) < 0.03;
}

function toHeatmapCoin(coin: CoinMarket): HeatmapCoin {
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    rank: coin.market_cap_rank,
    price: coin.current_price,
    marketCap: coin.market_cap,
    volume: coin.total_volume,
    change: {
      "1h": coin.price_change_percentage_1h_in_currency ?? null,
      "24h": coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h,
      "7d": coin.price_change_percentage_7d_in_currency ?? null,
    },
    stablecoin: isStablecoin(coin),
  };
}

async function HeatmapLoader() {
  const markets = await getTopMarkets().catch(() => [] as CoinMarket[]);
  if (!markets.length) {
    return (
      <Alert color="gray" variant="light" title="Market data is temporarily unavailable">
        We couldn&apos;t load prices just now. The heatmap refreshes automatically within a minute.
      </Alert>
    );
  }
  const updatedAt = markets.reduce<string | null>((latest, coin) => (coin.last_updated && (!latest || coin.last_updated > latest) ? coin.last_updated : latest), null);
  return <MarketHeatmap coins={markets.map(toHeatmapCoin)} updatedAt={updatedAt} />;
}

export default function HeatmapPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="sm" maw={780}>
          <Title order={1} fz={{ base: 30, sm: 42 }} lh={1.15}>
            Crypto market heatmap
          </Title>
          <Text c="dimmed" size="lg">
            The top 100 coins at a glance. Bigger tiles are bigger coins; green is up, red is down. Hover for details, click to open a coin.
          </Text>
        </Stack>
        <Suspense fallback={<Skeleton h={640} radius="md" />}>
          <HeatmapLoader />
        </Suspense>
      </Stack>
    </Container>
  );
}
