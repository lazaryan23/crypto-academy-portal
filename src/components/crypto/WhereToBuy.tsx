import { Paper, Stack, Text, Title } from "@mantine/core";
import { affiliateDisclosure, exchangeList } from "@/config/affiliates";
import { ExchangeCards } from "@/components/common/ExchangeCards";

export function WhereToBuy({ name, symbol }: { name: string; symbol: string }) {
  return (
    <Paper
      p={{ base: "md", sm: "xl" }}
      withBorder
      component="section"
      aria-labelledby="where-to-buy"
      style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--mantine-color-brand-7) 14%, transparent), transparent)" }}
    >
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={2} size="h3" id="where-to-buy">
            Where to buy & trade {name} ({symbol.toUpperCase()})
          </Title>
          <Text c="dimmed">
            Buy {symbol.toUpperCase()} on spot or trade it with futures on these exchanges. Use our codes for fee discounts and
            welcome bonuses.
          </Text>
        </Stack>
        <ExchangeCards items={exchangeList} ctaLabel="Trade" />
        <Text size="xs" c="dimmed">
          {affiliateDisclosure}
        </Text>
      </Stack>
    </Paper>
  );
}
