import type { Metadata } from "next";
import { Container, List, ListItem, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { Disclaimer } from "@/components/common/Disclaimer";
import { FuturesPositionCalculator } from "@/components/tools/FuturesPositionCalculator";
import { defaultOgImages } from "@/config/site";

export const metadata: Metadata = {
  title: "Futures Position Size & Liquidation Price Calculator",
  description:
    "Size a crypto futures trade from your account balance and risk: position size, required margin, estimated liquidation price, max loss at stop-loss and risk-to-reward ratio for longs and shorts.",
  alternates: { canonical: "/tools/position-size" },
  openGraph: { url: "/tools/position-size", images: defaultOgImages },
};

export default function PositionSizePage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="sm" maw={780}>
          <Title order={1} fz={{ base: 30, sm: 42 }} lh={1.15}>
            Futures position size &amp; liquidation calculator
          </Title>
          <Text c="dimmed" size="lg">
            Decide how big a trade should be from how much you are willing to lose, then check that your leverage keeps the liquidation price safely beyond your
            stop-loss.
          </Text>
        </Stack>

        <FuturesPositionCalculator />

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Paper withBorder p="lg">
            <Title order={2} size="h4" mb="sm">
              How it&apos;s calculated
            </Title>
            <List size="sm" spacing="xs">
              <ListItem>Risk amount = balance × risk %.</ListItem>
              <ListItem>Position size = risk amount ÷ distance from entry to stop (as a % of entry).</ListItem>
              <ListItem>Required margin = position size ÷ leverage.</ListItem>
              <ListItem>Liquidation (long) ≈ entry × (1 − 1/leverage + maintenance margin); shorts mirror it above entry.</ListItem>
              <ListItem>Risk : reward = distance to take-profit ÷ distance to stop-loss.</ListItem>
            </List>
          </Paper>
          <Paper withBorder p="lg">
            <Title order={2} size="h4" mb="sm">
              Why leverage doesn&apos;t change your risk
            </Title>
            <Text size="sm" c="dimmed">
              Your loss at the stop depends only on position size and stop distance. Leverage just changes how much margin you lock up and how close the
              liquidation price sits. Higher leverage frees capital but leaves less room before a liquidation, which is why the calculator warns when
              liquidation would come before your stop.
            </Text>
          </Paper>
        </SimpleGrid>

        <Disclaimer />
      </Stack>
    </Container>
  );
}
