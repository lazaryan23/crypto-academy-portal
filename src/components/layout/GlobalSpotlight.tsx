"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Group, Loader, Text, ThemeIcon } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import {
  SpotlightAction,
  SpotlightActionsGroup,
  SpotlightActionsList,
  SpotlightEmpty,
  SpotlightRoot,
  SpotlightSearch,
} from "@mantine/spotlight";
import { IconArrowsLeftRight, IconBook, IconCompass, IconSearch } from "@tabler/icons-react";
import type { CoinMarket, SearchCoin } from "@/types/coingecko";
import { loadTopCoins } from "@/lib/top-coins";
import { formatPrice } from "@/lib/format";

export interface SpotlightIndex {
  pages: { label: string; href: string; description: string }[];
  guides: { label: string; href: string; description: string }[];
  pairs: { label: string; href: string }[];
}

interface CoinResult {
  id: string;
  name: string;
  symbol: string;
  image: string;
  rank: number | null;
  price?: number | null;
}

function fromMarket(coin: CoinMarket): CoinResult {
  return { id: coin.id, name: coin.name, symbol: coin.symbol, image: coin.image, rank: coin.market_cap_rank, price: coin.current_price };
}

function fromSearch(coin: SearchCoin): CoinResult {
  return { id: coin.id, name: coin.name, symbol: coin.symbol, image: coin.thumb, rank: coin.market_cap_rank };
}

export function GlobalSpotlight({ index }: { index: SpotlightIndex }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debounced] = useDebouncedValue(query.trim(), 250);
  const [remote, setRemote] = useState<{ query: string; coins: CoinResult[] }>({ query: "", coins: [] });
  const [top, setTop] = useState<CoinResult[]>([]);

  const needle = query.trim().toLowerCase();
  const searching = needle.length >= 2;
  const loading = searching && (debounced.toLowerCase() !== needle || remote.query !== debounced);

  useEffect(() => {
    if (debounced.length < 2) return;
    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { coins: [] }))
      .then((data: { coins: SearchCoin[] }) => setRemote({ query: debounced, coins: data.coins.slice(0, 8).map(fromSearch) }))
      .catch((err: Error) => {
        if (err.name !== "AbortError") setRemote({ query: debounced, coins: [] });
      });
    return () => controller.abort();
  }, [debounced]);

  const loadTop = () => {
    if (top.length) return;
    loadTopCoins()
      .then((coins) => setTop(coins.map(fromMarket)))
      .catch(() => setTop([]));
  };

  const matches = (...texts: string[]) => !needle || texts.some((text) => text.toLowerCase().includes(needle));
  const coins = searching ? (remote.query === debounced ? remote.coins : []) : top;
  const pages = index.pages.filter((page) => matches(page.label, page.description));
  const guides = index.guides.filter((guide) => matches(guide.label, guide.description));
  const pairs = index.pairs.filter((pair) => matches(pair.label, pair.href));
  const nothing = !loading && coins.length + pages.length + guides.length + pairs.length === 0;

  const go = (href: string) => router.push(href);

  const coinsGroup = coins.length > 0 && (
    <SpotlightActionsGroup label={searching ? "Coins" : "Top coins"}>
      {coins.map((coin) => (
        <SpotlightAction
          key={coin.id}
          onClick={() => go(`/crypto/${coin.id}`)}
          leftSection={<Avatar src={coin.image} alt="" size={24} />}
          label={coin.name}
          description={`${coin.symbol.toUpperCase()}${coin.rank ? ` · #${coin.rank}` : ""}`}
          rightSection={
            coin.price != null ? (
              <Text size="xs" ff="monospace" fw={600}>
                {formatPrice(coin.price)}
              </Text>
            ) : null
          }
        />
      ))}
    </SpotlightActionsGroup>
  );

  const pagesGroup = pages.length > 0 && (
    <SpotlightActionsGroup label="Pages & tools">
      {pages.map((page) => (
        <SpotlightAction
          key={page.href}
          onClick={() => go(page.href)}
          leftSection={
            <ThemeIcon variant="light" size={24} radius="sm">
              <IconCompass size={14} />
            </ThemeIcon>
          }
          label={page.label}
          description={page.description}
        />
      ))}
    </SpotlightActionsGroup>
  );

  return (
    <SpotlightRoot
      query={query}
      onQueryChange={setQuery}
      shortcut={["mod + K"]}
      onSpotlightOpen={loadTop}
      clearQueryOnClose
      scrollable
      maxHeight={440}
    >
      <SpotlightSearch
        placeholder="Search coins, comparisons and guides…"
        leftSection={<IconSearch size={18} />}
        rightSection={loading ? <Loader size={16} /> : null}
        aria-label="Search the site"
      />
      <SpotlightActionsList>
        {needle ? pagesGroup : coinsGroup}
        {needle ? coinsGroup : pagesGroup}
        {pairs.length > 0 && (
          <SpotlightActionsGroup label="Comparisons">
            {pairs.map((pair) => (
              <SpotlightAction
                key={pair.href}
                onClick={() => go(pair.href)}
                leftSection={
                  <ThemeIcon variant="light" color="violet" size={24} radius="sm">
                    <IconArrowsLeftRight size={14} />
                  </ThemeIcon>
                }
                label={pair.label}
              />
            ))}
          </SpotlightActionsGroup>
        )}
        {guides.length > 0 && (
          <SpotlightActionsGroup label="Academy">
            {guides.map((guide) => (
              <SpotlightAction
                key={guide.href}
                onClick={() => go(guide.href)}
                leftSection={
                  <ThemeIcon variant="light" color="teal" size={24} radius="sm">
                    <IconBook size={14} />
                  </ThemeIcon>
                }
                label={guide.label}
                description={guide.description}
              />
            ))}
          </SpotlightActionsGroup>
        )}
        {nothing && (
          <SpotlightEmpty>
            <Group justify="center" py="md">
              <Text size="sm" c="dimmed">
                Nothing matches “{query.trim()}”.
              </Text>
            </Group>
          </SpotlightEmpty>
        )}
      </SpotlightActionsList>
    </SpotlightRoot>
  );
}
