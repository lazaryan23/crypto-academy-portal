"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Group, Loader, Select, Stack, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import type { CoinMarket, SearchCoin } from "@/types/coingecko";
import { formatPrice } from "@/lib/format";
import { PercentChange } from "@/components/common/PercentChange";

interface OptionMeta {
  image: string;
  symbol: string;
  rank: number | null;
  price?: number | null;
  change?: number | null;
}

let topCoinsRequest: Promise<CoinMarket[]> | null = null;

function loadTopCoins(): Promise<CoinMarket[]> {
  topCoinsRequest ??= fetch("/api/markets?category=top")
    .then((res) => (res.ok ? (res.json() as Promise<CoinMarket[]>) : Promise.reject(new Error(String(res.status)))))
    .catch((err) => {
      topCoinsRequest = null;
      throw err;
    });
  return topCoinsRequest;
}

export function CoinSearch({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced] = useDebouncedValue(search, 300);
  const [resolved, setResolved] = useState<{ query: string; coins: SearchCoin[] }>({ query: "", coins: [] });
  const [topCoins, setTopCoins] = useState<CoinMarket[] | null>(null);
  const [topStatus, setTopStatus] = useState<"idle" | "loading" | "error">("idle");

  const typed = search.trim();
  const query = debounced.trim();
  const remote = typed.length >= 2;
  const loading = remote && (query !== typed || resolved.query !== query);

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

  const ensureTopCoins = () => {
    if (topCoins || topStatus === "loading") return;
    setTopStatus("loading");
    loadTopCoins()
      .then((coins) => {
        setTopCoins(coins.slice(0, 10));
        setTopStatus("idle");
      })
      .catch(() => setTopStatus("error"));
  };

  const meta = new Map<string, OptionMeta>();
  let data: { group: string; items: { value: string; label: string }[] }[] = [];

  if (remote) {
    const coins = resolved.query === query ? resolved.coins : [];
    coins.forEach((c) => meta.set(c.id, { image: c.thumb, symbol: c.symbol, rank: c.market_cap_rank }));
    if (coins.length) data = [{ group: "Search results", items: coins.map((c) => ({ value: c.id, label: c.name })) }];
  } else {
    const needle = typed.toLowerCase();
    const coins = (topCoins ?? []).filter(
      (c) => !needle || c.name.toLowerCase().includes(needle) || c.symbol.toLowerCase().includes(needle),
    );
    coins.forEach((c) =>
      meta.set(c.id, {
        image: c.image,
        symbol: c.symbol,
        rank: c.market_cap_rank,
        price: c.current_price,
        change: c.price_change_percentage_24h,
      }),
    );
    if (coins.length) data = [{ group: "Top cryptos by market cap", items: coins.map((c) => ({ value: c.id, label: c.name })) }];
  }

  const nothingFound = remote
    ? loading
      ? "Searching…"
      : "No coins found"
    : topStatus === "loading"
      ? "Loading top cryptos…"
      : topStatus === "error"
        ? "Couldn't load top cryptos — type to search"
        : typed
          ? "Keep typing to search all coins"
          : undefined;

  return (
    <Select
      searchable
      clearable={false}
      value={null}
      searchValue={search}
      onSearchChange={setSearch}
      onFocus={ensureTopCoins}
      onDropdownOpen={ensureTopCoins}
      placeholder="Search coins…"
      aria-label="Search cryptocurrencies"
      leftSection={<IconSearch size={16} />}
      rightSection={loading || topStatus === "loading" ? <Loader size={14} /> : null}
      data={data}
      filter={({ options }) => options}
      nothingFoundMessage={nothingFound}
      comboboxProps={{
        width: 320,
        position: "bottom-end",
        styles: {
          dropdown: {
            maxHeight: "min(360px, 60dvh)",
            overflowY: "auto",
            overscrollBehavior: "contain",
          },
          groupLabel: {
            fontSize: "var(--mantine-font-size-xs)",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          },
        },
      }}
      withScrollArea={false}
      renderOption={({ option }) => {
        const coin = meta.get(option.value);
        return (
          <Group gap="sm" wrap="nowrap" w="100%">
            <Text size="xs" c="dimmed" w={32} ta="right" style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
              {coin?.rank ?? ""}
            </Text>
            <Avatar src={coin?.image} size={22} alt="" />
            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" truncate>
                {option.label}
              </Text>
              <Text size="xs" c="dimmed" tt="uppercase">
                {coin?.symbol}
              </Text>
            </Stack>
            {coin?.price != null && (
              <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
                <Text size="xs" ff="monospace" fw={600}>
                  {formatPrice(coin.price)}
                </Text>
                <PercentChange value={coin.change} size="xs" />
              </Stack>
            )}
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
