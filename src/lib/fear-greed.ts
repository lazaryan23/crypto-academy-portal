import { cacheLife } from "next/cache";

export interface FearGreed {
  value: number;
  label: string;
}

async function cachedFearGreed(): Promise<FearGreed | null> {
  "use cache";
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as { data?: { value: string; value_classification: string }[] };
    const latest = body.data?.[0];
    const value = Number(latest?.value);
    if (!latest || !Number.isFinite(value)) throw new Error("empty");
    cacheLife({ stale: 600, revalidate: 1800, expire: 86400 });
    return { value, label: latest.value_classification };
  } catch {
    cacheLife({ stale: 0, revalidate: 60, expire: 300 });
    return null;
  }
}

export function getFearGreed(): Promise<FearGreed | null> {
  return cachedFearGreed();
}
