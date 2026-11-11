import { CardLink } from "@/components/common/Links";
import { Avatar, Badge, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { getMarkets } from "@/lib/coingecko";
import { longTermPicks } from "@/content/investing";
import { formatCompactUsd, formatPrice } from "@/lib/format";
import { PercentChange } from "@/components/common/PercentChange";

export async function LongTermPicks() {
  const markets = await getMarkets({ ids: longTermPicks.map((p) => p.id), perPage: longTermPicks.length }).catch(() => []);
  const byId = new Map(markets.map((m) => [m.id, m]));

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
      {longTermPicks.map((pick) => {
        const market = byId.get(pick.id);
        return (
          <CardLink key={pick.id} href={`/crypto/${pick.id}`} padding="lg">
            <Stack gap="sm">
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                  <Avatar src={market?.image} alt="" size={36}>
                    {pick.id.slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Stack gap={0}>
                    <Text fw={700}>{market?.name ?? pick.id}</Text>
                    <Text size="xs" c="dimmed" tt="uppercase">
                      {market?.symbol}
                    </Text>
                  </Stack>
                </Group>
                <Badge variant="light" color={pick.tier === "Core" ? "brand" : "blue"}>
                  {pick.tier}
                </Badge>
              </Group>
              {market && (
                <Group justify="space-between">
                  <Text ff="monospace" fw={700}>
                    {formatPrice(market.current_price)}
                  </Text>
                  <Group gap={6}>
                    <PercentChange value={market.price_change_percentage_24h} size="xs" />
                    <Text size="xs" c="dimmed">
                      MCap {formatCompactUsd(market.market_cap)}
                    </Text>
                  </Group>
                </Group>
              )}
              <Text size="sm">
                <Text span fw={700} c="teal">
                  Thesis:{" "}
                </Text>
                {pick.thesis}
              </Text>
              <Text size="sm">
                <Text span fw={700} c="red">
                  Risks:{" "}
                </Text>
                {pick.risks}
              </Text>
            </Stack>
          </CardLink>
        );
      })}
    </SimpleGrid>
  );
}
