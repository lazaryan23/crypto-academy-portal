import type { Metadata } from "next";
import { Badge, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowsLeftRight, IconCalculator, IconChartLine, IconGasStation } from "@tabler/icons-react";
import { CardLink } from "@/components/common/Links";
import { defaultOgImages } from "@/config/site";

export const metadata: Metadata = {
  title: "Free Crypto Tools — Profit Calculator, DCA Backtester, Gas Tracker & More",
  description: "Free crypto tools: trade profit and ROI after fees, DCA backtesting, live Bitcoin and Ethereum fees, a crypto converter, and side-by-side coin comparison.",
  alternates: { canonical: "/tools" },
  openGraph: { url: "/tools", images: defaultOgImages },
};

const tools = [
  {
    href: "/tools/calculator",
    title: "Profit & tax calculator",
    text: "Profit, loss and ROI on a trade after buying and selling fees, with your break-even price and an optional tax estimate.",
    icon: IconCalculator,
    color: "teal",
  },
  {
    href: "/tools/dca",
    title: "DCA backtester",
    text: "See what weekly or monthly buys over the last year would be worth today, compared with investing it all at once.",
    icon: IconChartLine,
    color: "cyan",
  },
  {
    href: "/tools/gas-converter",
    title: "Gas tracker & converter",
    text: "Live Bitcoin fees and Ethereum gas with the dollar cost of a transfer or swap, plus a crypto-to-fiat converter.",
    icon: IconGasStation,
    color: "orange",
  },
  {
    href: "/compare",
    title: "Compare coins",
    text: "Put two coins' returns on one chart and compare market cap, supply and all-time highs side by side.",
    icon: IconArrowsLeftRight,
    color: "violet",
  },
] as const;

export default function ToolsPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="sm" maw={760}>
          <Badge variant="light" size="lg" w="fit-content">
            Tools
          </Badge>
          <Title order={1} fz={{ base: 30, sm: 42 }} lh={1.15}>
            Free crypto tools
          </Title>
          <Text c="dimmed" size="lg">
            Calculators that work with live prices, no sign-up needed.
          </Text>
        </Stack>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {tools.map((tool) => (
            <CardLink key={tool.href} href={tool.href} withBorder padding="lg">
              <Stack gap="sm">
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon variant="light" color={tool.color} size={40} radius="md">
                    <tool.icon size={22} />
                  </ThemeIcon>
                  <Text fw={700}>{tool.title}</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  {tool.text}
                </Text>
              </Stack>
            </CardLink>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
