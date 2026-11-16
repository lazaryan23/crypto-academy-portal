import { cacheLife } from "next/cache";

export interface FearGreed {
  value: number;
  label: string;
}

export interface FearGreedHistory {
  now: FearGreed;
  yesterday: FearGreed | null;
  lastWeek: FearGreed | null;
  lastMonth: FearGreed | null;
}

type FngEntry = { value: string; value_classification: string };

function toReading(entry: FngEntry | undefined): FearGreed | null {
  const value = Number(entry?.value);
  return entry && Number.isFinite(value) ? { value, label: entry.value_classification } : null;
}

async function cachedFearGreedHistory(): Promise<FearGreedHistory | null> {
  "use cache";
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=31", { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as { data?: FngEntry[] };
    const data = body.data ?? [];
    const now = toReading(data[0]);
    if (!now) throw new Error("empty");
    cacheLife({ stale: 600, revalidate: 1800, expire: 86400 });
    return { now, yesterday: toReading(data[1]), lastWeek: toReading(data[7]), lastMonth: toReading(data[30]) };
  } catch {
    cacheLife({ stale: 0, revalidate: 60, expire: 300 });
    return null;
  }
}

export function getFearGreedHistory(): Promise<FearGreedHistory | null> {
  return cachedFearGreedHistory();
}

export async function getFearGreed(): Promise<FearGreed | null> {
  return (await cachedFearGreedHistory())?.now ?? null;
}

export function fearGreedColor(value: number) {
  if (value < 25) return "red";
  if (value < 45) return "orange";
  if (value <= 55) return "yellow";
  if (value < 75) return "lime";
  return "teal";
}
