"use client";

import Link from "next/link";
import { Button, Group } from "@mantine/core";
import { IconFlame, IconPercentage } from "@tabler/icons-react";

const tabs = [
  { href: "/derivatives", label: "Funding & open interest", icon: IconPercentage },
  { href: "/liquidations", label: "Liquidations", icon: IconFlame },
] as const;

export function DerivativesTabs({ active }: { active: (typeof tabs)[number]["href"] }) {
  return (
    <Group gap="xs" component="nav" aria-label="Derivatives sections">
      {tabs.map((tab) => (
        <Button
          key={tab.href}
          component={Link}
          href={tab.href}
          size="xs"
          radius="xl"
          variant={tab.href === active ? "light" : "default"}
          leftSection={<tab.icon size={14} />}
          aria-current={tab.href === active ? "page" : undefined}
        >
          {tab.label}
        </Button>
      ))}
    </Group>
  );
}
