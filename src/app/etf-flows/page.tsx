import type { Metadata } from "next";
import { Container, Stack, Text, Title } from "@mantine/core";
import { EtfFlowsPanel } from "@/components/etf/EtfFlowsPanel";
import { defaultOgImages } from "@/config/site";
import { getEtfFlows } from "@/lib/etf-flows";

export const metadata: Metadata = {
  title: "Bitcoin & Ethereum Spot ETF Flows — Daily Net Inflows by Issuer",
  description:
    "Track daily net inflows and outflows for US spot Bitcoin and Ether ETFs, cumulative flows, and the breakdown by issuer: IBIT, FBTC, GBTC, ARKB, BITB, ETHA and more.",
  alternates: { canonical: "/etf-flows" },
  openGraph: { url: "/etf-flows", images: defaultOgImages },
};

export default async function EtfFlowsPage() {
  const [btc, eth] = await Promise.all([getEtfFlows("BTC"), getEtfFlows("ETH")]);
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={1}>Spot Bitcoin &amp; Ether ETF flows</Title>
          <Text c="dimmed" maw={760}>
            Daily net money moving into or out of US spot crypto ETFs. Sustained inflows mean funds are buying the underlying coin; outflows mean they are
            selling it.
          </Text>
        </Stack>
        <EtfFlowsPanel data={{ BTC: btc, ETH: eth }} />
      </Stack>
    </Container>
  );
}
