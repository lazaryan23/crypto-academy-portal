import { Container, Skeleton, Stack } from "@mantine/core";
import { MarketTableSkeleton } from "@/components/market/MarketTableSkeleton";

export default function Loading() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Skeleton height={40} width="60%" />
        <Skeleton height={18} width="40%" />
        <MarketTableSkeleton />
      </Stack>
    </Container>
  );
}
