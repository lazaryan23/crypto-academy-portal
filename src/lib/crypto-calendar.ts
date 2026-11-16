import { cacheLife } from "next/cache";
import { fomcDecisions } from "@/content/fed-meetings";
import { getMarkets } from "@/lib/coingecko";
import { unlockImpact, type CalendarEvent, type CalendarSnapshot, type Impact, type MacroEvent, type UnlockEvent } from "@/lib/calendar-config";

const DAY_MS = 86_400_000;
const HORIZON_DAYS = 90;
const MIN_PCT = 0.05;
const MIN_USD = 1_000_000;

const UNLOCK_SLUGS: Record<string, string | null> = {
  arbitrum: "arbitrum",
  aptos: null,
  avalanche: null,
  celestia: null,
  eigenlayer: null,
  grass: null,
  kaito: null,
  layerzero: null,
  monad: null,
  movement: null,
  "ondo-finance": null,
  plasma: null,
  sei: null,
  zetachain: null,
  "zksync-era": null,
  worldcoin: null,
  jupiter: null,
  berachain: null,
  ethena: null,
  pendle: null,
  dydx: null,
  sonic: null,
  hyperliquid: null,
};

type Allocation = { recipient: string; amount: number };
type RawUnlock = { timestamp: number; cliffAllocations?: Allocation[]; summary?: { totalTokensCliff?: number } };
type Emission = { gecko_id?: string | null; metadata?: { unlockEvents?: RawUnlock[] } };

async function pool<T, R>(items: T[], size: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await task(items[index]);
      }
    }),
  );
  return results;
}

async function cachedUnlocks(): Promise<UnlockEvent[]> {
  "use cache";
  const now = Date.now();
  const horizon = now + HORIZON_DAYS * DAY_MS;
  const raw = await pool(Object.entries(UNLOCK_SLUGS), 6, async ([slug, geckoOverride]) => {
    try {
      const res = await fetch(`https://defillama-datasets.llama.fi/emissions/${slug}`, { signal: AbortSignal.timeout(25_000), cache: "no-store" });
      if (!res.ok) return null;
      const body = (await res.json()) as Emission;
      const geckoId = geckoOverride ?? body.gecko_id ?? null;
      const events = (body.metadata?.unlockEvents ?? []).filter(
        (event) => event.timestamp * 1000 > now && event.timestamp * 1000 < horizon && (event.summary?.totalTokensCliff ?? 0) > 0,
      );
      return geckoId && events.length ? { slug, geckoId, events } : null;
    } catch {
      return null;
    }
  });
  const found = raw.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const markets = found.length ? await getMarkets({ ids: found.map((entry) => entry.geckoId), perPage: found.length }).catch(() => []) : [];
  const byId = new Map(markets.map((coin) => [coin.id, coin]));

  const unlocks: UnlockEvent[] = [];
  for (const entry of found) {
    const coin = byId.get(entry.geckoId);
    for (const event of entry.events) {
      const tokens = event.summary?.totalTokensCliff ?? 0;
      const usd = coin?.current_price ? tokens * coin.current_price : null;
      const pct = coin?.circulating_supply ? (tokens / coin.circulating_supply) * 100 : null;
      if ((pct ?? 0) < MIN_PCT && (usd ?? 0) < MIN_USD) continue;
      const recipients = [...new Set((event.cliffAllocations ?? []).map((allocation) => allocation.recipient))];
      unlocks.push({
        kind: "unlock",
        id: `unlock:${entry.slug}:${event.timestamp}`,
        date: event.timestamp * 1000,
        coinId: entry.geckoId,
        symbol: (coin?.symbol ?? entry.slug).toUpperCase(),
        name: coin?.name ?? entry.slug,
        image: coin?.image ?? null,
        tokens,
        usd,
        pctOfCirculating: pct,
        recipients,
        impact: unlockImpact(pct, usd),
      });
    }
  }
  cacheLife(found.length ? { stale: 3600, revalidate: 6 * 3600, expire: 86400 } : { stale: 0, revalidate: 300, expire: 1800 });
  return unlocks;
}

type FfEvent = { title: string; country: string; date: string; impact: string; forecast?: string; previous?: string };

const FF_IMPACT: Record<string, Impact> = { High: "high", Medium: "medium", Low: "low" };

let lastGoodMacro: { events: MacroEvent[]; coverageUntil: number | null } | null = null;

async function cachedMacro(): Promise<{ events: MacroEvent[]; coverageUntil: number | null }> {
  "use cache";
  const events: MacroEvent[] = [];
  let coverageUntil: number | null = null;
  try {
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as FfEvent[];
    for (const item of body) {
      const impact = FF_IMPACT[item.impact];
      const date = Date.parse(item.date);
      if (!impact || !Number.isFinite(date)) continue;
      coverageUntil = Math.max(coverageUntil ?? 0, date);
      if (item.country !== "USD" && impact !== "high") continue;
      events.push({
        kind: "macro",
        id: `macro:${item.country}:${item.date}:${item.title}`,
        date,
        title: item.title,
        country: item.country,
        forecast: item.forecast || null,
        previous: item.previous || null,
        impact,
        source: "Forex Factory",
      });
    }
    cacheLife({ stale: 1800, revalidate: 3600, expire: 86400 });
    lastGoodMacro = { events, coverageUntil };
    return lastGoodMacro;
  } catch {
    cacheLife({ stale: 0, revalidate: 300, expire: 1800 });
    return lastGoodMacro ?? { events: [], coverageUntil: null };
  }
}

function fedDecisions(now: number): MacroEvent[] {
  return fomcDecisions
    .map((iso) => Date.parse(iso))
    .filter((date) => date > now - DAY_MS && date < now + HORIZON_DAYS * DAY_MS)
    .map((date) => ({
      kind: "macro" as const,
      id: `fomc:${date}`,
      date,
      title: "FOMC interest rate decision",
      country: "USD",
      forecast: null,
      previous: null,
      impact: "high" as const,
      source: "Federal Reserve",
    }));
}

export async function getCryptoCalendar(): Promise<CalendarSnapshot> {
  const [unlocks, macro] = await Promise.all([cachedUnlocks(), cachedMacro()]);
  const now = Date.now();
  const fomc = fedDecisions(now).filter(
    (event) => !macro.events.some((m) => Math.abs(m.date - event.date) < 3 * 3_600_000 && /FOMC|Federal Funds/i.test(m.title)),
  );
  const events: CalendarEvent[] = [...unlocks, ...macro.events, ...fomc].filter((event) => event.date > now - DAY_MS).sort((a, b) => a.date - b.date);
  return { events, macroCoverageUntil: macro.coverageUntil, updatedAt: new Date().toISOString() };
}
