import { Group, Skeleton, Stack } from "@mantine/core";

export function MarketTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <Stack gap={0} p="md" aria-busy="true" aria-label="Loading market data">
      {Array.from({ length: rows }, (_, i) => (
        <Group key={i} justify="space-between" py="sm" wrap="nowrap" gap="md">
          <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
            <Skeleton height={14} width={20} />
            <Skeleton height={28} circle />
            <Stack gap={6} style={{ flex: 1 }}>
              <Skeleton height={12} width="40%" />
              <Skeleton height={10} width="20%" />
            </Stack>
          </Group>
          <Skeleton height={14} width={90} />
          <Skeleton height={14} width={60} />
          <Skeleton height={14} width={110} visibleFrom="sm" />
        </Group>
      ))}
    </Stack>
  );
}
