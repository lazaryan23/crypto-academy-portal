import { Badge, Button, Card, Group, List, ListItem, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconExternalLink } from "@tabler/icons-react";
import type { ExchangeAffiliate } from "@/config/affiliates";

export function ExchangeCards({ items, ctaLabel = "Sign up" }: { items: ExchangeAffiliate[]; ctaLabel?: string }) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: items.length > 2 ? 4 : 2 }} spacing="md">
      {items.map((exchange) => (
        <Card key={exchange.id} padding="lg">
          <Stack gap="sm" h="100%" justify="space-between">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={800} size="lg">
                  {exchange.name}
                </Text>
                <Badge color={exchange.color} variant="light">
                  Code: {exchange.promoCode}
                </Badge>
              </Group>
              <Text fw={600} c="brand">
                {exchange.headline}
              </Text>
              <List
                size="sm"
                spacing={4}
                icon={
                  <ThemeIcon size={16} radius="xl" variant="light">
                    <IconCheck size={11} />
                  </ThemeIcon>
                }
              >
                {exchange.perks.map((perk) => (
                  <ListItem key={perk}>{perk}</ListItem>
                ))}
              </List>
            </Stack>
            <Button
              component="a"
              href={exchange.referralUrl}
              target="_blank"
              rel="sponsored noopener noreferrer"
              rightSection={<IconExternalLink size={16} />}
              fullWidth
              mt="sm"
            >
              {ctaLabel} on {exchange.name}
            </Button>
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}
