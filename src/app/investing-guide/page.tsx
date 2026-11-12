import type { Metadata } from "next";
import { defaultOgImages } from "@/config/site";
import { Suspense } from "react";
import { Badge, Card, Container, SimpleGrid, Skeleton, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCircleCheck } from "@tabler/icons-react";
import { investingPrinciples } from "@/content/investing";
import { exchangeList } from "@/config/affiliates";
import { AllocationPlanner } from "@/components/investing/AllocationPlanner";
import { LongTermPicks } from "@/components/investing/LongTermPicks";
import { ExchangeCards } from "@/components/common/ExchangeCards";
import { Disclaimer } from "@/components/common/Disclaimer";

export const metadata: Metadata = {
  title: "Crypto Investing Guide — Which Top Cryptos Are Worth Long-Term Investment?",
  description:
    "A long-term crypto investing framework: core holdings, top altcoins, the 60/30/10 risk allocation, dollar-cost averaging and rebalancing.",
  alternates: { canonical: "/investing-guide" },
  openGraph: { url: "/investing-guide", images: defaultOgImages },
};

function PicksSkeleton() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} height={220} radius="lg" />
      ))}
    </SimpleGrid>
  );
}

export default function InvestingGuidePage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap={48}>
        <Stack gap="md" maw={800}>
          <Badge variant="light" size="lg" w="fit-content">
            Investment Guide
          </Badge>
          <Title order={1} fz={{ base: 30, sm: 42 }} lh={1.15}>
            Which top cryptos are worth long-term investment?
          </Title>
          <Text size="lg" c="dimmed">
            There is no guaranteed winner in crypto. A durable long-term portfolio focuses on assets with real adoption, deep
            liquidity and a long track record — and sizes everything else as a speculative bet.
          </Text>
          <Disclaimer />
        </Stack>

        <Stack gap="md">
          <Title order={2} size="h3">
            Assets with the strongest long-term case
          </Title>
          <Text c="dimmed" maw={800}>
            These large-cap assets are commonly held as long-term positions. Each has a clear thesis — and clear risks you should
            understand before buying.
          </Text>
          <Suspense fallback={<PicksSkeleton />}>
            <LongTermPicks />
          </Suspense>
        </Stack>

        <Stack gap="md">
          <Title order={2} size="h3">
            Risk distribution strategies
          </Title>
          <Text c="dimmed" maw={800}>
            Split your portfolio into a stable core, a growth satellite and a small high-risk sleeve. Pick a profile and enter an
            amount to see how it would be allocated.
          </Text>
          <AllocationPlanner />
        </Stack>

        <Stack gap="md">
          <Title order={2} size="h3">
            Five rules for long-term crypto investors
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {investingPrinciples.map((p) => (
              <Card key={p.title} padding="lg">
                <ThemeIcon variant="light" size={36} radius="md">
                  <IconCircleCheck size={20} />
                </ThemeIcon>
                <Text fw={700} mt="sm">
                  {p.title}
                </Text>
                <Text size="sm" c="dimmed" mt={4}>
                  {p.text}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>

        <Stack gap="md">
          <Title order={2} size="h3">
            Where to buy for the long term
          </Title>
          <ExchangeCards items={exchangeList} ctaLabel="Buy" />
        </Stack>
      </Stack>
    </Container>
  );
}
