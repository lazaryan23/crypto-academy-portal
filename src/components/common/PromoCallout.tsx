import { Button, Group, Paper, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconDiscount2, IconExternalLink } from "@tabler/icons-react";
import { affiliateDisclosure, featuredPromo, getExchanges } from "@/config/affiliates";

export function PromoCallout({ compact = false }: { compact?: boolean }) {
  const items = getExchanges(featuredPromo.exchangeIds);
  return (
    <Paper
      p={compact ? "md" : "xl"}
      withBorder
      style={{
        backgroundColor: "color-mix(in srgb, var(--mantine-color-yellow-6) 9%, var(--mantine-color-body))",
        borderColor: "color-mix(in srgb, var(--mantine-color-yellow-6) 35%, transparent)",
      }}
    >
      <Group justify="space-between" align="center" gap="lg">
        <Group align="flex-start" wrap="nowrap" gap="md" style={{ flex: "1 1 320px" }}>
          <ThemeIcon size={compact ? 40 : 52} radius="xl" variant="filled" color="yellow">
            <IconDiscount2 size={compact ? 22 : 28} />
          </ThemeIcon>
          <Stack gap={4}>
            <Title order={compact ? 4 : 3}>{featuredPromo.title}</Title>
            <Text size={compact ? "sm" : "md"}>{featuredPromo.description}</Text>
            <Text size="xs" c="dimmed">
              {affiliateDisclosure}
            </Text>
          </Stack>
        </Group>
        <Group gap="sm">
          {items.map((exchange) => (
            <Button
              key={exchange.id}
              component="a"
              href={exchange.referralUrl}
              target="_blank"
              rel="sponsored noopener noreferrer"
              color={exchange.color}
              variant="filled"
              rightSection={<IconExternalLink size={14} />}
            >
              {exchange.name} · {exchange.promoCode}
            </Button>
          ))}
        </Group>
      </Group>
    </Paper>
  );
}
