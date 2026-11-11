"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Group, Paper, ScrollArea, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { useInterval } from "@mantine/hooks";
import { IconAlertCircle, IconSearch } from "@tabler/icons-react";
import type { CoinMarket, MarketCategory } from "@/types/coingecko";
import { MarketTable } from "./MarketTable";
import { MarketTableSkeleton } from "./MarketTableSkeleton";

const REFRESH_MS = 60_000;

export const marketCategories: { value: MarketCategory; label: string }[] = [
  { value: "top", label: "Top 10" },
  { value: "trending", label: "Trending" },
  { value: "layer-1", label: "Layer 1" },
  { value: "defi", label: "DeFi" },
  { value: "meme", label: "Meme" },
];

type CacheEntry = { data: CoinMarket[]; updatedAt: number | null };

export function MarketDashboard({ initialData }: { initialData: CoinMarket[] | null }) {
  const [category, setCategory] = useState<MarketCategory>("top");
  const [query, setQuery] = useState("");
  const [cache, setCache] = useState<Partial<Record<MarketCategory, CacheEntry>>>(() =>
    initialData ? { top: { data: initialData, updatedAt: null } } : {},
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialData);
  const inflight = useRef<AbortController | null>(null);

  const fetchCategory = useCallback((target: MarketCategory) => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    return fetch(`/api/markets?category=${target}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Failed to load market data.");
        setCache((prev) => ({ ...prev, [target]: { data: body as CoinMarket[], updatedAt: Date.now() } }));
        setError(null);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (inflight.current === controller) setLoading(false);
      });
  }, []);

  const refresh = useCallback(
    (target: MarketCategory) => {
      setLoading(true);
      void fetchCategory(target);
    },
    [fetchCategory],
  );

  useEffect(() => {
    if (!initialData) void fetchCategory("top");
    return () => inflight.current?.abort();
  }, [initialData, fetchCategory]);

  useInterval(
    () => {
      if (document.visibilityState === "visible") refresh(category);
    },
    REFRESH_MS,
    { autoInvoke: true },
  );

  const changeCategory = (next: MarketCategory) => {
    setCategory(next);
    const cached = cache[next];
    if (!cached || (cached.updatedAt !== null && Date.now() - cached.updatedAt > REFRESH_MS)) refresh(next);
  };

  const entry = cache[category];

  const rows = useMemo(() => {
    const data = entry?.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((coin) => coin.name.toLowerCase().includes(q) || coin.symbol.toLowerCase().includes(q));
  }, [entry, query]);

  return (
    <Stack gap="md">
      <Group justify="space-between" gap="sm">
        <ScrollArea type="never" maw="100%">
          <SegmentedControl
            value={category}
            onChange={(value) => changeCategory(value as MarketCategory)}
            data={marketCategories}
            aria-label="Market category"
          />
        </ScrollArea>
        <Group gap="sm" wrap="nowrap" style={{ flex: "1 1 240px" }} justify="flex-end">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Filter by name or symbol"
            aria-label="Filter coins"
            leftSection={<IconSearch size={16} />}
            w={{ base: "100%", sm: 260 }}
          />
          <Badge variant="dot" color={loading ? "yellow" : error ? "red" : "teal"} visibleFrom="sm" style={{ flexShrink: 0 }}>
            {loading ? "Updating" : error ? "Stale" : "Live"}
          </Badge>
        </Group>
      </Group>

      {error && (
        <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} title="Market data unavailable">
          {error} {entry ? "Showing the last loaded prices." : "We'll retry automatically."}
        </Alert>
      )}

      <Paper withBorder>
        {!entry ? (
          <MarketTableSkeleton />
        ) : rows.length === 0 ? (
          <Text p="xl" ta="center" c="dimmed">
            No coins match “{query}”. Try the search in the header to look up any coin.
          </Text>
        ) : (
          <MarketTable coins={rows} />
        )}
      </Paper>

      {entry && (
        <Text size="xs" c="dimmed" ta="right">
          {entry.updatedAt ? `Updated ${new Date(entry.updatedAt).toLocaleTimeString()}` : "Server snapshot"} · auto-refreshes every minute
        </Text>
      )}
    </Stack>
  );
}
