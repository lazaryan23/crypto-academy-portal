import { Suspense } from "react";
import { Badge, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowRight, IconBook2, IconChartCandle, IconScale } from "@tabler/icons-react";
import { ButtonLink, CardLink } from "@/components/common/Links";
import { getMarkets } from "@/lib/coingecko";
import { MarketDashboard } from "@/components/market/MarketDashboard";
import { MarketTableSkeleton } from "@/components/market/MarketTableSkeleton";
import { PromoCallout } from "@/components/common/PromoCallout";
import { HeroSection } from "@/components/home/HeroSection";
import { Reveal } from "@/components/motion/Reveal";
import { HoverLift } from "@/components/motion/HoverLift";
import { guides } from "@/content/academy";

async function LiveMarkets() {
  const initialData = await getMarkets({ category: "top" }).catch(() => null);
  return <MarketDashboard initialData={initialData} />;
}

const features = [
  { icon: IconChartCandle, title: "Live markets", text: "Prices, volume and market cap refreshed every minute.", href: "#markets", gradient: { from: "cyan", to: "blue" } },
  { icon: IconBook2, title: "Trading Academy", text: "Spot vs futures, longs & shorts, leverage and risk.", href: "/academy", gradient: { from: "blue", to: "violet" } },
  { icon: IconScale, title: "Investing guide", text: "Long-term allocation frameworks and how to size risk.", href: "/investing-guide", gradient: { from: "violet", to: "grape" } },
];

export default function HomePage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap={56}>
        <HeroSection />

        <Reveal>
          <Stack gap="md" id="markets" style={{ scrollMarginTop: 84 }}>
            <Title order={2} size="h3">
              Cryptocurrency prices today
            </Title>
            <Suspense fallback={<MarketTableSkeleton />}>
              <LiveMarkets />
            </Suspense>
          </Stack>
        </Reveal>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 0.08}>
              <HoverLift>
                <CardLink href={feature.href} padding="lg" h="100%">
                  <ThemeIcon size={44} radius="md" variant="gradient" gradient={feature.gradient}>
                    <feature.icon size={24} />
                  </ThemeIcon>
                  <Text fw={700} mt="md">
                    {feature.title}
                  </Text>
                  <Text size="sm" c="dimmed" mt={4}>
                    {feature.text}
                  </Text>
                </CardLink>
              </HoverLift>
            </Reveal>
          ))}
        </SimpleGrid>

        <Reveal>
          <HoverLift scale={1.015}>
            <PromoCallout />
          </HoverLift>
        </Reveal>

        <Stack gap="md">
          <Reveal>
            <Group justify="space-between">
              <Title order={2} size="h3">
                From the Trading Academy
              </Title>
              <ButtonLink href="/academy" variant="subtle" rightSection={<IconArrowRight size={16} />}>
                All guides
              </ButtonLink>
            </Group>
          </Reveal>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            {guides.map((guide, i) => (
              <Reveal key={guide.slug} delay={i * 0.08}>
                <HoverLift>
                  <CardLink href={`/academy/${guide.slug}`} padding="lg" h="100%">
                    <Badge variant="light" color={guide.color} mb="sm">
                      {guide.level}
                    </Badge>
                    <Text fw={700}>{guide.title}</Text>
                    <Text size="sm" c="dimmed" mt="xs" lineClamp={3}>
                      {guide.description}
                    </Text>
                  </CardLink>
                </HoverLift>
              </Reveal>
            ))}
          </SimpleGrid>
        </Stack>
      </Stack>
    </Container>
  );
}
