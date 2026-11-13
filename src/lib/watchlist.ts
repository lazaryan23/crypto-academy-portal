"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@mantine/hooks";
import { WATCHLIST_LIMIT } from "./watchlist-limits";

const emptyWatchlist: string[] = [];

function deserialize(value: string | undefined): string[] {
  if (!value) return emptyWatchlist;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, WATCHLIST_LIMIT) : emptyWatchlist;
  } catch {
    return emptyWatchlist;
  }
}

export function useWatchlist() {
  const [ids, setIds] = useLocalStorage<string[]>({
    key: "coincompass:watchlist",
    defaultValue: emptyWatchlist,
    deserialize,
  });

  const toggle = useCallback(
    (id: string) =>
      setIds((current) =>
        current.includes(id) ? current.filter((x) => x !== id) : [...current, id].slice(-WATCHLIST_LIMIT),
      ),
    [setIds],
  );

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, has, toggle };
}
