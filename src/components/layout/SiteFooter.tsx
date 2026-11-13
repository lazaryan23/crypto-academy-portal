import { AnchorLink } from "@/components/common/Links";
import { Anchor, Box, Container, Divider, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { siteConfig, riskDisclaimer } from "@/config/site";
import { affiliateDisclosure } from "@/config/affiliates";
import { guides } from "@/content/academy";

export function SiteFooter() {
  return (
    <Box component="footer" py="xl" mt="xl" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
      <Container size="xl">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
          <Stack gap="xs">
            <Text fw={800}>{siteConfig.name}</Text>
            <Text size="sm" c="dimmed">
              {siteConfig.description}
            </Text>
          </Stack>
          <Stack gap={6}>
            <Text fw={600} size="sm">
              Academy
            </Text>
            {guides.map((guide) => (
              <AnchorLink key={guide.slug} href={`/academy/${guide.slug}`} size="sm" c="dimmed">
                {guide.shortTitle}
              </AnchorLink>
            ))}
          </Stack>
          <Stack gap={6}>
            <Text fw={600} size="sm">
              Explore
            </Text>
            {[...siteConfig.nav, ...siteConfig.tools].map((item) => (
              <AnchorLink key={item.href} href={item.href} size="sm" c="dimmed">
                {item.label}
              </AnchorLink>
            ))}
            <Anchor href="https://www.coingecko.com" target="_blank" rel="noopener" size="sm" c="dimmed">
              Market data by CoinGecko
            </Anchor>
          </Stack>
        </SimpleGrid>
        <Divider my="lg" />
        <Stack gap={6}>
          <Text size="xs" c="dimmed">
            {riskDisclaimer}
          </Text>
          <Text size="xs" c="dimmed">
            {affiliateDisclosure}
          </Text>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              © {siteConfig.name}
            </Text>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
