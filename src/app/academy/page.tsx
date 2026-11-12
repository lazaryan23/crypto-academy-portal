import type { Metadata } from "next";
import { defaultOgImages } from "@/config/site";
import { CardLink } from "@/components/common/Links";
import { Badge, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowsExchange, IconClock, IconScale, IconShieldCheck, IconTrendingUp } from "@tabler/icons-react";
import { guides } from "@/content/academy";
import { exchangeList } from "@/config/affiliates";
import { PromoCallout } from "@/components/common/PromoCallout";
import { ExchangeCards } from "@/components/common/ExchangeCards";
import { Disclaimer } from "@/components/common/Disclaimer";

export const metadata: Metadata = {
  title: "Futures & Trading Academy — Learn Crypto Trading Step by Step",
  description:
    "Free crypto trading academy: spot vs futures, how to open long and short positions, leverage from 1x to 50x, margin safety and risk management to avoid liquidation.",
  alternates: { canonical: "/academy" },
  openGraph: { url: "/academy", images: defaultOgImages },
};

const icons = {
  "spot-vs-futures": IconArrowsExchange,
  "long-and-short-positions": IconTrendingUp,
  "understanding-leverage": IconScale,
  "risk-management": IconShieldCheck,
} as const;

export default function AcademyPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap={48}>
        <Stack gap="md" maw={760}>
          <Badge variant="light" size="lg" w="fit-content">
            Futures & Trading Academy
          </Badge>
          <Title order={1} fz={{ base: 32, sm: 44 }} lh={1.15}>
            Learn to trade crypto futures — without blowing up your account
          </Title>
          <Text size="lg" c="dimmed">
            Four practical guides with interactive diagrams and calculators. Read them in order: each builds on the last.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {guides.map((guide, i) => {
            const Icon = icons[guide.slug as keyof typeof icons] ?? IconTrendingUp;
            return (
              <CardLink key={guide.slug} href={`/academy/${guide.slug}`} padding="xl">
                <Group justify="space-between" align="flex-start">
                  <ThemeIcon size={48} radius="md" variant="light" color={guide.color}>
                    <Icon size={26} />
                  </ThemeIcon>
                  <Text size="sm" c="dimmed" fw={700}>
                    Lesson {i + 1}
                  </Text>
                </Group>
                <Title order={2} size="h4" mt="md">
                  {guide.title}
                </Title>
                <Text c="dimmed" mt="xs">
                  {guide.description}
                </Text>
                <Group gap="xs" mt="md">
                  <Badge variant="light" color={guide.color}>
                    {guide.level}
                  </Badge>
                  <Badge variant="default" leftSection={<IconClock size={12} />}>
                    {guide.readMinutes} min read
                  </Badge>
                </Group>
              </CardLink>
            );
          })}
        </SimpleGrid>

        <PromoCallout />

        <Stack gap="md">
          <Title order={2} size="h3">
            Recommended exchanges for futures trading
          </Title>
          <ExchangeCards items={exchangeList.filter((e) => e.supportsFutures)} />
        </Stack>

        <Disclaimer />
      </Stack>
    </Container>
  );
}
