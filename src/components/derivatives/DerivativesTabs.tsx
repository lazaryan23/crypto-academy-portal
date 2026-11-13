"use client";

import Link from "next/link";
import { Box, Button, Group } from "@mantine/core";
import { IconChartCandle, IconFlame, IconPercentage } from "@tabler/icons-react";

const tabs = [
  { href: "/derivatives", label: "Funding & open interest", short: "Funding", icon: IconPercentage },
  { href: "/liquidations", label: "Liquidations", short: "Liquidations", icon: IconFlame },
  { href: "/options", label: "Options", short: "Options", icon: IconChartCandle },
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
          <Box component="span" visibleFrom="xs">
            {tab.label}
          </Box>
          <Box component="span" hiddenFrom="xs">
            {tab.short}
          </Box>
        </Button>
      ))}
    </Group>
  );
}
