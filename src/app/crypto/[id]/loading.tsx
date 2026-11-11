import { Container } from "@mantine/core";
import { CoinDetailSkeleton } from "@/components/crypto/CoinDetailSkeleton";

export default function Loading() {
  return (
    <Container size="xl" py="xl">
      <CoinDetailSkeleton />
    </Container>
  );
}
