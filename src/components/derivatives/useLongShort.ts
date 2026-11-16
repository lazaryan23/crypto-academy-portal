"use client";

import { useEffect, useState } from "react";
import type { LongShortCoin, LongShortSnapshot, LongShortTimeframe } from "@/lib/long-short-config";

type State = { status: "loading" } | { status: "ok"; data: LongShortSnapshot } | { status: "error"; message: string };

const MAX_AGE_MS = 60_000;
const cache = new Map<string, { at: number; data: LongShortSnapshot }>();

export function useLongShort(coin: LongShortCoin, timeframe: LongShortTimeframe) {
  const key = `${coin}:${timeframe}`;
  const [results, setResults] = useState<Record<string, State>>({});

  useEffect(() => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < MAX_AGE_MS) return;
    const controller = new AbortController();
    fetch(`/api/long-short?coin=${coin}&tf=${timeframe}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? "Long/short data is unavailable.");
        cache.set(key, { at: Date.now(), data: body as LongShortSnapshot });
        setResults((prev) => ({ ...prev, [key]: { status: "ok", data: body as LongShortSnapshot } }));
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setResults((prev) => ({ ...prev, [key]: { status: "error", message: error.message } }));
      });
    return () => controller.abort();
  }, [key, coin, timeframe]);

  const cached = cache.get(key);
  return results[key] ?? (cached ? ({ status: "ok", data: cached.data } as State) : ({ status: "loading" } as State));
}
