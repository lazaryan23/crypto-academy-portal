import { Group, Paper, Text } from "@mantine/core";
import { IconArrowsLeftRight } from "@tabler/icons-react";
import { AnchorLink } from "@/components/common/Links";
import { pairCoinNames, pairSlug, pairsFor } from "@/lib/pairs";

export function CompareLinks({ coinId, name }: { coinId: string; name: string }) {
  const pairs = pairsFor(coinId);
  if (!pairs.length) return null;
  return (
    <Paper withBorder p="md">
      <Group gap="sm" wrap="wrap">
        <Group gap={6} wrap="nowrap">
          <IconArrowsLeftRight size={18} color="var(--mantine-color-violet-4)" />
          <Text fw={600} size="sm">
            Compare {name} with
          </Text>
        </Group>
        {pairs.map(([a, b]) => {
          const other = a === coinId ? b : a;
          return (
            <AnchorLink key={pairSlug(a, b)} href={`/compare/${pairSlug(a, b)}`} size="sm">
              {pairCoinNames[other] ?? other}
            </AnchorLink>
          );
        })}
      </Group>
    </Paper>
  );
}
