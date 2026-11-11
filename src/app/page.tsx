import { ButtonLink, CardLink } from "@/components/common/Links";
import { Suspense } from "react";
import { Badge, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowRight, IconBook2, IconChartCandle, IconScale } from "@tabler/icons-react";
import { getMarkets } from "@/lib/coingecko";
import { MarketDashboard } from "@/components/market/MarketDashboard";
import { MarketTableSkeleton } from "@/components/market/MarketTableSkeleton";
import { PromoCallout } from "@/components/common/PromoCallout";
import { guides } from "@/content/academy";

async function LiveMarkets() {
  const initialData = await getMarkets({ category: "top" }).catch(() => null);
  return <MarketDashboard initialData={initialData} />;
}

const features = [
  { icon: IconChartCandle, title: "Live markets", text: "Prices, volume and market cap refreshed every minute.", href: "#markets" },
  { icon: IconBook2, title: "Trading Academy", text: "Spot vs futures, longs & shorts, leverage and risk.", href: "/academy" },
  { icon: IconScale, title: "Investing guide", text: "Long-term allocation frameworks and how to size risk.", href: "/investing-guide" },
];

export default function HomePage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap={48}>
        <Stack gap="md" maw={760}>
          <Badge variant="light" size="lg" w="fit-content">
            Live crypto market dashboard
          </Badge>
          <Title order={1} fz={{ base: 32, sm: 44 }} lh={1.15}>
            Track the crypto market. Learn to trade it safely.
          </Title>
          <Text size="lg" c="dimmed">
            Real-time prices for Bitcoin, Ethereum, Solana, TON and thousands more — plus practical guides on futures,
            leverage and long-term investing.
          </Text>
        </Stack>

        <Stack gap="md" id="markets">
          <Title order={2} size="h3">
            Cryptocurrency prices today
          </Title>
          <Suspense fallback={<MarketTableSkeleton />}>
            <LiveMarkets />
          </Suspense>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {features.map((feature) => (
            <CardLink key={feature.title} href={feature.href} padding="lg">
              <ThemeIcon size={44} radius="md" variant="light">
                <feature.icon size={24} />
              </ThemeIcon>
              <Text fw={700} mt="md">
                {feature.title}
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                {feature.text}
              </Text>
            </CardLink>
          ))}
        </SimpleGrid>

        <PromoCallout />

        <Stack gap="md">
          <Group justify="space-between">
            <Title order={2} size="h3">
              From the Trading Academy
            </Title>
            <ButtonLink href="/academy" variant="subtle" rightSection={<IconArrowRight size={16} />}>
              All guides
            </ButtonLink>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            {guides.map((guide) => (
              <CardLink key={guide.slug} href={`/academy/${guide.slug}`} padding="lg">
                <Badge variant="light" color={guide.color} mb="sm">
                  {guide.level}
                </Badge>
                <Text fw={700}>{guide.title}</Text>
                <Text size="sm" c="dimmed" mt="xs" lineClamp={3}>
                  {guide.description}
                </Text>
              </CardLink>
            ))}
          </SimpleGrid>
        </Stack>
      </Stack>
    </Container>
  );
}
