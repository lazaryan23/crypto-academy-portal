import { cacheLife } from "next/cache";
import { getDerivativesOverview } from "@/lib/derivatives-market";
import { parseContract } from "@/lib/funding";
import { addToTally, emptyTally, okxEvents, type ContractValues, type LiquidationEvent, type LiquidationTally } from "@/lib/liquidation-feed";

export interface CoinLiquidations extends LiquidationTally {
  base: string;
}

export interface RecentLiquidations {
  windowStart: number;
  windowEnd: number;
  totals: LiquidationTally;
  coins: CoinLiquidations[];
  largest: LiquidationEvent | null;
  events: LiquidationEvent[];
}

export interface LiquidationSetup {
  okxContractValues: ContractValues;
  bybitSymbols: Record<string, string>;
  trackedBases: string[];
}

const TIMEOUT_MS = 8000;
const HOUR_MS = 3_600_000;
const MAX_PAGES = 6;
const OKX_FAMILIES = 10;
const BYBIT_SUBSCRIPTIONS = 30;
const FAILURE_LIFE = { stale: 0, revalidate: 20, expire: 300 };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

async function cachedOkxContractValues(): Promise<ContractValues | null> {
  "use cache";
  try {
    const body = await getJson<{ code: string; data: { instId: string; ctVal: string; ctType: string; state: string }[] }>(
      "https://www.okx.com/api/v5/public/instruments?instType=SWAP",
    );
    if (body.code !== "0") throw new Error(body.code);
    const values: ContractValues = {};
    for (const item of body.data) {
      const ctVal = Number(item.ctVal);
      if (!item.instId.endsWith("-USDT-SWAP") || item.ctType !== "linear" || !(ctVal > 0)) continue;
      values[item.instId.split("-")[0]] = ctVal;
    }
    cacheLife("days");
    return values;
  } catch {
    cacheLife(FAILURE_LIFE);
    return null;
  }
}

async function cachedBybitSymbols(): Promise<Record<string, string> | null> {
  "use cache";
  try {
    type Instrument = { symbol: string; baseCoin: string; quoteCoin: string; status: string; contractType: string };
    const body = await getJson<{ retCode: number; result: { list: Instrument[] } }>("https://api.bybit.com/v5/market/instruments-info?category=linear&limit=1000");
    if (body.retCode !== 0) throw new Error(String(body.retCode));
    const symbols: Record<string, string> = {};
    for (const item of body.result.list) {
      if (item.quoteCoin !== "USDT" || item.contractType !== "LinearPerpetual" || item.status !== "Trading") continue;
      const { base } = parseContract(item.baseCoin);
      if (!symbols[base] || item.symbol === `${base}USDT`) symbols[base] = item.symbol;
    }
    cacheLife("days");
    return symbols;
  } catch {
    cacheLife(FAILURE_LIFE);
    return null;
  }
}

type OkxPage = { code: string; data: { instId: string; details: Parameters<typeof okxEvents>[1] }[] };

async function okxFamilyHistory(base: string, since: number, contractValues: ContractValues) {
  const events: LiquidationEvent[] = [];
  let after: string | null = null;
  let complete = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url: string = `https://www.okx.com/api/v5/public/liquidation-orders?instType=SWAP&instFamily=${base}-USDT&state=filled&limit=100${after ? `&after=${after}` : ""}`;
    const body: OkxPage = await getJson<OkxPage>(url);
    const details: OkxPage["data"][number]["details"] = body.data[0]?.details ?? [];
    if (body.code !== "0" || !details.length) {
      complete = true;
      break;
    }
    events.push(...okxEvents(`${base}-USDT-SWAP`, details, contractValues));
    const oldest = Number(details[details.length - 1].ts);
    if (oldest <= since || details.length < 100) {
      complete = true;
      break;
    }
    after = details[details.length - 1].ts;
  }
  const oldestSeen = events.length ? Math.min(...events.map((item) => item.time)) : since;
  return { events, coveredFrom: complete ? since : oldestSeen };
}

async function cachedRecentLiquidations(familyList: string): Promise<RecentLiquidations | null> {
  "use cache";
  const contractValues = await cachedOkxContractValues();
  const families = familyList.split(",").filter((base) => base && contractValues?.[base]);
  if (!contractValues || !families.length) {
    cacheLife(FAILURE_LIFE);
    return null;
  }
  const now = Date.now();
  const since = now - HOUR_MS;
  const results = await Promise.all(families.map((base) => okxFamilyHistory(base, since, contractValues).catch(() => null)));
  const ok = results.filter((result) => result !== null);
  if (!ok.length) {
    cacheLife(FAILURE_LIFE);
    return null;
  }
  const windowStart = Math.max(since, ...ok.map((result) => result.coveredFrom));
  const events = ok
    .flatMap((result) => result.events)
    .filter((item) => item.time >= windowStart)
    .sort((a, b) => b.time - a.time);

  const totals = emptyTally();
  const byCoin = new Map<string, CoinLiquidations>();
  let largest: LiquidationEvent | null = null;
  for (const item of events) {
    addToTally(totals, item);
    const coin = byCoin.get(item.base) ?? { base: item.base, ...emptyTally() };
    addToTally(coin, item);
    byCoin.set(item.base, coin);
    if (!largest || item.usd > largest.usd) largest = item;
  }
  cacheLife({ stale: 60, revalidate: 120, expire: 900 });
  return {
    windowStart,
    windowEnd: now,
    totals,
    coins: [...byCoin.values()].sort((a, b) => b.longUsd + b.shortUsd - (a.longUsd + a.shortUsd)),
    largest,
    events: events.slice(0, 60),
  };
}

export async function getLiquidationSetup(): Promise<LiquidationSetup> {
  const [overview, okxContractValues, bybitSymbols] = await Promise.all([getDerivativesOverview(), cachedOkxContractValues(), cachedBybitSymbols()]);
  const ranked = [...overview.rows].sort((a, b) => (b.totalOiUsd ?? 0) - (a.totalOiUsd ?? 0)).map((row) => row.symbol);
  return {
    okxContractValues: okxContractValues ?? {},
    bybitSymbols: Object.fromEntries(ranked.filter((base) => bybitSymbols?.[base]).slice(0, BYBIT_SUBSCRIPTIONS).map((base) => [bybitSymbols![base], base])),
    trackedBases: ranked,
  };
}

export async function getRecentLiquidations(): Promise<RecentLiquidations | null> {
  const overview = await getDerivativesOverview();
  const families = [...overview.rows]
    .filter((row) => row.venues.OKX)
    .sort((a, b) => (b.totalOiUsd ?? 0) - (a.totalOiUsd ?? 0))
    .slice(0, OKX_FAMILIES)
    .map((row) => row.symbol);
  return families.length ? cachedRecentLiquidations(families.join(",")) : null;
}

