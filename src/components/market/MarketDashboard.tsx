"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Center, Group, Paper, ScrollArea, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { useInterval } from "@mantine/hooks";
import { IconAlertCircle, IconSearch, IconStar, IconStarFilled } from "@tabler/icons-react";
import type { CoinMarket, MarketCategory } from "@/types/coingecko";
import { useWatchlist } from "@/lib/watchlist";
import { MarketTable } from "./MarketTable";
import { MarketTableSkeleton } from "./MarketTableSkeleton";

const REFRESH_MS = 60_000;

type DashboardTab = MarketCategory | "watchlist";

export const marketCategories: { value: MarketCategory; label: string }[] = [
  { value: "top", label: "Top 10" },
  { value: "trending", label: "Trending" },
  { value: "layer-1", label: "Layer 1" },
  { value: "defi", label: "DeFi" },
  { value: "meme", label: "Meme" },
];

type CacheEntry = { data: CoinMarket[]; updatedAt: number | null };

function urlFor(tab: DashboardTab, ids: string[]) {
  return tab === "watchlist" ? `/api/markets?ids=${[...ids].sort().join(",")}` : `/api/markets?category=${tab}`;
}

export function MarketDashboard({ initialData }: { initialData: CoinMarket[] | null }) {
  const { ids: watchlist } = useWatchlist();
  const watchlistRef = useRef(watchlist);
  const [tab, setTab] = useState<DashboardTab>("top");
  const [query, setQuery] = useState("");
  const [cache, setCache] = useState<Partial<Record<DashboardTab, CacheEntry>>>(() =>
    initialData ? { top: { data: initialData, updatedAt: null } } : {},
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialData);
  const inflight = useRef<AbortController | null>(null);

  const fetchTab = useCallback((target: DashboardTab) => {
    inflight.current?.abort();
    if (target === "watchlist" && watchlistRef.current.length === 0) {
      setCache((prev) => ({ ...prev, watchlist: { data: [], updatedAt: Date.now() } }));
      setLoading(false);
      return Promise.resolve();
    }
    const controller = new AbortController();
    inflight.current = controller;
    return fetch(urlFor(target, watchlistRef.current), { signal: controller.signal })
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
    (target: DashboardTab) => {
      setLoading(true);
      void fetchTab(target);
    },
    [fetchTab],
  );

  useEffect(() => {
    if (!initialData) void fetchTab("top");
    return () => inflight.current?.abort();
  }, [initialData, fetchTab]);

  const watchlistData = cache.watchlist?.data;
  useEffect(() => {
    watchlistRef.current = watchlist;
    if (tab !== "watchlist" || watchlist.length === 0) return;
    const loaded = new Set(watchlistData?.map((coin) => coin.id));
    if (!watchlistData || watchlist.some((id) => !loaded.has(id))) void fetchTab("watchlist");
  }, [watchlist, tab, watchlistData, fetchTab]);

  useInterval(
    () => {
      if (document.visibilityState === "visible") refresh(tab);
    },
    REFRESH_MS,
    { autoInvoke: true },
  );

  const changeTab = (next: DashboardTab) => {
    setTab(next);
    setError(null);
    if (next === "watchlist") return;
    const cached = cache[next];
    if (!cached || (cached.updatedAt !== null && Date.now() - cached.updatedAt > REFRESH_MS)) refresh(next);
  };

  const entry = cache[tab];

  const positions = useMemo(() => new Map(entry?.data.map((coin, index) => [coin.id, index + 1])), [entry]);

  const rows = useMemo(() => {
    let data = entry?.data ?? [];
    if (tab === "watchlist") {
      const order = new Map(watchlist.map((id, i) => [id, i]));
      data = data.filter((coin) => order.has(coin.id)).sort((a, b) => (a.market_cap_rank ?? Infinity) - (b.market_cap_rank ?? Infinity));
    }
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((coin) => coin.name.toLowerCase().includes(q) || coin.symbol.toLowerCase().includes(q));
  }, [entry, query, tab, watchlist]);

  const tabs = [
    {
      value: "watchlist",
      label: (
        <Center style={{ gap: 6 }}>
          {watchlist.length ? <IconStarFilled size={14} color="var(--mantine-color-yellow-5)" /> : <IconStar size={14} />}
          <span>Watchlist{watchlist.length ? ` (${watchlist.length})` : ""}</span>
        </Center>
      ),
    },
    ...marketCategories,
  ];

  const showEmptyWatchlist = tab === "watchlist" && watchlist.length === 0;

  return (
    <Stack gap="md">
      <Group justify="space-between" gap="sm">
        <ScrollArea type="never" maw="100%">
          <SegmentedControl value={tab} onChange={(value) => changeTab(value as DashboardTab)} data={tabs} aria-label="Market category" />
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
        {showEmptyWatchlist ? (
          <Stack align="center" gap={6} p="xl">
            <IconStar size={28} color="var(--mantine-color-yellow-5)" />
            <Text fw={600}>Your watchlist is empty</Text>
            <Text size="sm" c="dimmed" ta="center" maw={420}>
              Tap the star next to any coin, here or on its page, to follow it. Your watchlist is saved in this browser — no account needed.
            </Text>
          </Stack>
        ) : !entry ? (
          <MarketTableSkeleton />
        ) : rows.length === 0 ? (
          <Text p="xl" ta="center" c="dimmed">
            No coins match “{query}”. Try the search in the header to look up any coin.
          </Text>
        ) : (
          <MarketTable coins={rows} rankOf={tab === "top" ? (coin) => positions.get(coin.id) ?? null : undefined} />
        )}
      </Paper>

      {entry && !showEmptyWatchlist && (
        <Text size="xs" c="dimmed" ta="right">
          {entry.updatedAt ? `Updated ${new Date(entry.updatedAt).toLocaleTimeString()}` : "Server snapshot"} · auto-refreshes every minute
        </Text>
      )}
    </Stack>
  );
}
