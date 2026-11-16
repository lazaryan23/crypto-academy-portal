import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert, Container, Skeleton, Stack, Text, Title } from "@mantine/core";
import { WhaleFeed } from "@/components/whales/WhaleFeed";
import { defaultOgImages } from "@/config/site";
import { getWhaleTransfers } from "@/lib/whale-transfers";

export const metadata: Metadata = {
  title: "Whale Tracker — Large Bitcoin, Ethereum, USDT & USDC Transfers",
  description:
    "Live feed of $1M+ on-chain transfers of BTC, ETH, USDT and USDC, flagged when they move into or out of major exchange wallets like Binance, Coinbase, Kraken and OKX.",
  alternates: { canonical: "/whales" },
  openGraph: { url: "/whales", images: defaultOgImages },
};

async function FeedLoader() {
  const snapshot = await getWhaleTransfers();
  if (!snapshot.transfers.length) {
    return (
      <Alert color="gray" variant="light" title="No large transfers loaded yet">
        We couldn&apos;t scan the latest blocks just now. This page refreshes automatically.
      </Alert>
    );
  }
  return <WhaleFeed initial={snapshot} />;
}

export default function WhalesPage() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={1}>Whale transfers</Title>
          <Text c="dimmed" maw={760}>
            Every on-chain transfer of $1M or more in BTC, ETH, USDT and USDC, read straight from the latest Bitcoin and Ethereum blocks. Coins moving into an
            exchange can signal selling; coins leaving exchanges usually go to long-term storage.
          </Text>
        </Stack>
        <Suspense
          fallback={
            <Stack gap="xs">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} h={70} radius="md" />
              ))}
            </Stack>
          }
        >
          <FeedLoader />
        </Suspense>
        <Text size="xs" c="dimmed">
          Exchange labels cover well-known hot and cold wallets of Binance, Coinbase, Kraken, OKX, Bybit, Gemini, Crypto.com and Bitfinex. Exchanges also use many
          deposit addresses we can&apos;t identify, so some exchange flows appear as wallet-to-wallet. Bitcoin amounts are the largest output of each transaction,
          excluding change back to the sender.
        </Text>
      </Stack>
    </Container>
  );
}
