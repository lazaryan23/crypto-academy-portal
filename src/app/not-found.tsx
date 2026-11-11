import { ButtonLink } from "@/components/common/Links";
import { Container, Stack, Text, Title } from "@mantine/core";

export default function NotFound() {
  return (
    <Container size="sm" py={80}>
      <Stack align="center" gap="md" ta="center">
        <Title order={1}>Page not found</Title>
        <Text c="dimmed">The page you’re looking for doesn’t exist or has moved.</Text>
        <ButtonLink href="/">
          Back to markets
        </ButtonLink>
      </Stack>
    </Container>
  );
}
