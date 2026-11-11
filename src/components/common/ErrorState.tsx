"use client";

import Link from "next/link";
import { Button, Container, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <Container size="sm" py={80}>
      <Stack align="center" gap="md" ta="center">
        <ThemeIcon size={64} radius="xl" color="red" variant="light">
          <IconAlertTriangle size={34} />
        </ThemeIcon>
        <Title order={2}>{title}</Title>
        <Text c="dimmed">{message}</Text>
        <Group>
          <Button leftSection={<IconRefresh size={16} />} onClick={onRetry}>
            Try again
          </Button>
          <Button component={Link} href="/" variant="default">
            Go to markets
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
