"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Group, Loader, Select, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import type { SearchCoin } from "@/types/coingecko";

export function CoinSearch({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced] = useDebouncedValue(search, 300);
  const [resolved, setResolved] = useState<{ query: string; coins: SearchCoin[] }>({ query: "", coins: [] });
  const query = debounced.trim();
  const active = search.trim().length >= 2;
  const loading = active && (query !== search.trim() || resolved.query !== query);
  const results = active ? resolved.coins : [];

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { coins: [] }))
      .then((data: { coins: SearchCoin[] }) => setResolved({ query, coins: data.coins }))
      .catch((err: Error) => {
        if (err.name !== "AbortError") setResolved({ query, coins: [] });
      });
    return () => controller.abort();
  }, [query]);

  const byId = new Map(results.map((coin) => [coin.id, coin]));

  return (
    <Select
      searchable
      clearable={false}
      value={null}
      searchValue={search}
      onSearchChange={setSearch}
      placeholder="Search coins…"
      aria-label="Search cryptocurrencies"
      leftSection={<IconSearch size={16} />}
      rightSection={loading ? <Loader size={14} /> : null}
      data={results.map((coin) => ({ value: coin.id, label: coin.name }))}
      filter={({ options }) => options}
      nothingFoundMessage={active && !loading ? "No coins found" : undefined}
      comboboxProps={{
        width: 300,
        position: "bottom-end",
        styles: {
          dropdown: {
            maxHeight: "min(320px, 60dvh)",
            overflowY: "auto",
            overscrollBehavior: "contain",
          },
        },
      }}
      withScrollArea={false}
      renderOption={({ option }) => {
        const coin = byId.get(option.value);
        return (
          <Group gap="sm" wrap="nowrap">
            <Avatar src={coin?.thumb} size={22} alt="" />
            <Text size="sm" style={{ flex: 1 }} truncate>
              {option.label}
            </Text>
            <Text size="xs" c="dimmed">
              {coin?.symbol}
            </Text>
          </Group>
        );
      }}
      onChange={(id) => {
        if (!id) return;
        setSearch("");
        onNavigate?.();
        router.push(`/crypto/${id}`);
      }}
    />
  );
}
