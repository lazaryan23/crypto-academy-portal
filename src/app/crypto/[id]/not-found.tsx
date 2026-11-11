import { ButtonLink } from "@/components/common/Links";
import { Container, Stack, Text, Title } from "@mantine/core";

export default function CoinNotFound() {
  return (
    <Container size="sm" py={80}>
      <Stack align="center" gap="md" ta="center">
        <Title order={1}>Coin not found</Title>
        <Text c="dimmed">We couldn’t find that cryptocurrency. Check the spelling or use the search in the header.</Text>
        <ButtonLink href="/">
          Back to markets
        </ButtonLink>
      </Stack>
    </Container>
  );
}
