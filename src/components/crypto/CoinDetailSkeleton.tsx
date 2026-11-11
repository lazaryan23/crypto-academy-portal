import { Group, Paper, SimpleGrid, Skeleton, Stack } from "@mantine/core";

export function CoinDetailSkeleton() {
  return (
    <Stack gap="xl" aria-busy="true" aria-label="Loading coin details">
      <Skeleton height={14} width={160} />
      <Group justify="space-between" align="flex-end">
        <Group gap="md">
          <Skeleton height={56} circle />
          <Stack gap={8}>
            <Skeleton height={28} width={200} />
            <Skeleton height={12} width={120} />
          </Stack>
        </Group>
        <Stack gap={8} align="flex-end">
          <Skeleton height={34} width={180} />
          <Skeleton height={14} width={80} />
        </Stack>
      </Group>
      <Paper withBorder p="md">
        <Skeleton height={32} width={280} mb="md" />
        <Skeleton height={380} />
      </Paper>
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} height={86} radius="lg" />
        ))}
      </SimpleGrid>
      <Skeleton height={260} radius="lg" />
    </Stack>
  );
}
