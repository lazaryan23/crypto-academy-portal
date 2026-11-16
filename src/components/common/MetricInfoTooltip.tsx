"use client";

import Link from "next/link";
import { ActionIcon, Anchor, Popover, PopoverDropdown, PopoverTarget, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowRight, IconInfoCircle } from "@tabler/icons-react";
import { metricGlossary, type MetricKey } from "@/content/metric-glossary";

export function MetricInfoTooltip({ metric, size = 16 }: { metric: MetricKey; size?: number }) {
  const entry = metricGlossary[metric];
  const [opened, { open, close, toggle }] = useDisclosure(false);

  return (
    <Popover opened={opened} onChange={(next) => (next ? open() : close())} width={300} position="bottom-start" withArrow shadow="md">
      <PopoverTarget>
        <ActionIcon
          variant="subtle"
          color="gray"
          size={size + 8}
          radius="xl"
          aria-label={`What is ${entry.title.toLowerCase()}?`}
          onClick={(event) => {
            event.stopPropagation();
            toggle();
          }}
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <IconInfoCircle size={size} />
        </ActionIcon>
      </PopoverTarget>
      <PopoverDropdown onMouseEnter={open} onMouseLeave={close} onClick={(event) => event.stopPropagation()}>
        <Stack gap={6}>
          <Text size="sm" fw={700}>
            {entry.title}
          </Text>
          <Text size="xs" c="dimmed" lh={1.5}>
            {entry.text}
          </Text>
          <Anchor component={Link} href={entry.href} size="xs" fw={700} onClick={close} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            Learn more: {entry.linkLabel} <IconArrowRight size={12} />
          </Anchor>
        </Stack>
      </PopoverDropdown>
    </Popover>
  );
}
