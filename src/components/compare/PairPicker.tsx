"use client";

import { useRouter } from "next/navigation";
import { Group, Select, Text } from "@mantine/core";
import { pairSlug } from "@/lib/pairs";

export interface CoinOption {
  value: string;
  label: string;
}

export function PairPicker({ options, a, b }: { options: CoinOption[]; a?: string; b?: string }) {
  const router = useRouter();
  const go = (nextA: string | null | undefined, nextB: string | null | undefined) => {
    if (nextA && nextB && nextA !== nextB) router.push(`/compare/${pairSlug(nextA, nextB)}`);
  };

  return (
    <Group gap="sm" align="flex-end" wrap="wrap">
      <Select
        label="Compare"
        data={options}
        value={a ?? null}
        onChange={(value) => go(value, b)}
        searchable
        allowDeselect={false}
        placeholder="Pick a coin"
        w={{ base: "100%", xs: 200 }}
      />
      <Text c="dimmed" pb={8} visibleFrom="xs">
        vs
      </Text>
      <Select
        label="With"
        data={options.filter((option) => option.value !== a)}
        value={b ?? null}
        onChange={(value) => go(a, value)}
        searchable
        allowDeselect={false}
        placeholder="Pick a coin"
        w={{ base: "100%", xs: 200 }}
      />
    </Group>
  );
}
