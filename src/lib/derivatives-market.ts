import { cacheLife } from "next/cache";
import { getTopMarkets } from "@/lib/coingecko";
import { toFunding8h, toFundingApr, VENUES, type Venue, type VenueQuote } from "@/lib/funding";
import type { CoinMarket } from "@/types/coingecko";


type BookQuote = VenueQuote & { unitPrice: number | null };
type VenueBook = Record<string, BookQuote>;

export interface DerivativesRow {
  id: string;
  symbol: string;
  name: string;
  image: string;
  rank: number | null;
  price: number | null;
  change24h: number | null;
  venues: Partial<Record<Venue, VenueQuote>>;
  totalOiUsd: number | null;
  oiChange24h: number | null;
  avgFunding8h: number | null;
  spreadApr: number | null;
}

export interface LongShortReading {
  longPct: number;
  shortPct: number;
}

export interface DerivativesOverview {
  rows: DerivativesRow[];
  venuesOnline: Venue[];
  totalOiUsd: number;
  weightedFunding8h: number | null;
  btcLongShort: LongShortReading | null;
  updatedAt: string;
}

const TIMEOUT_MS = 8000;
const BINANCE = "https://fapi.binance.com";
const MULTIPLIER = /^(1000000|100000|10000|1000|100)(?=[A-Z])/;
const SUFFIX_MULTIPLIER = /(?<=[A-Z]{2})(1000)$/;
const HYPERLIQUID_MULTIPLIER = /^k()(?=[A-Z])/;

const SUCCESS_LIFE = { stale: 60, revalidate: 60, expire: 600 };
const FAILURE_LIFE = { stale: 0, revalidate: 20, expire: 300 };

const noPerpetualSymbols = new Set([
  "USDT", "USDC", "DAI", "FDUSD", "USDE", "USDS", "SUSDE", "SUSDS", "TUSD", "PYUSD", "USD1", "RLUSD", "USDD", "GHO", "FRAX", "USDX", "USDG",
  "USDF", "BFUSD", "EURC", "USDTB", "BUSD", "USDP", "LUSD", "CRVUSD", "WBTC", "WETH", "STETH", "WSTETH", "WEETH", "CBBTC", "BSC-USD", "XAUT", "PAXG",
]);

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { accept: "application/json", ...init?.headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

function parseContract(raw: string, pattern = MULTIPLIER) {
  const suffix = raw.match(SUFFIX_MULTIPLIER);
  if (suffix) return { base: raw.slice(0, -suffix[0].length), multiplier: Number(suffix[0]) };
  const match = raw.match(pattern);
  const multiplier = match ? (match[1] ? Number(match[1]) : 1000) : 1;
  return { base: raw.replace(pattern, ""), multiplier };
}

function unitPrice(price: number | null, multiplier: number) {
  return price !== null && price > 0 ? price / multiplier : null;
}

function addQuote(book: VenueBook, base: string, quote: BookQuote) {
  const existing = book[base];
  if (!existing || (quote.oiUsd ?? 0) > (existing.oiUsd ?? 0)) book[base] = quote;
}

async function cachedBinanceBook(): Promise<VenueBook | null> {
  "use cache";
  try {
    type Premium = { symbol: string; markPrice: string; lastFundingRate: string; nextFundingTime: number };
    const [premium, info] = await Promise.all([
      getJson<Premium[]>(`${BINANCE}/fapi/v1/premiumIndex`),
      getJson<{ symbol: string; fundingIntervalHours: number }[]>(`${BINANCE}/fapi/v1/fundingInfo`).catch(() => []),
    ]);
    const intervals = new Map(info.map((item) => [item.symbol, item.fundingIntervalHours]));
    const book: VenueBook = {};
    for (const item of premium) {
      if (!item.symbol.endsWith("USDT")) continue;
      const funding = num(item.lastFundingRate);
      if (funding === null) continue;
      const { base, multiplier } = parseContract(item.symbol.slice(0, -4));
      addQuote(book, base, {
        funding,
        unitPrice: unitPrice(num(item.markPrice), multiplier),
        intervalHours: intervals.get(item.symbol) ?? 8,
        oiUsd: null,
        nextFundingTime: num(item.nextFundingTime),
      });
    }
    if (!Object.keys(book).length) throw new Error("empty");
    cacheLife(SUCCESS_LIFE);
    return book;
  } catch {
    cacheLife(FAILURE_LIFE);
    return null;
  }
}

async function cachedBybitBook(): Promise<VenueBook | null> {
  "use cache";
  try {
    type Ticker = { symbol: string; markPrice: string; fundingRate: string; openInterestValue: string; nextFundingTime: string; fundingIntervalHour?: string };
    const body = await getJson<{ retCode: number; result: { list: Ticker[] } }>("https://api.bybit.com/v5/market/tickers?category=linear");
    if (body.retCode !== 0) throw new Error(String(body.retCode));
    const book: VenueBook = {};
    for (const item of body.result.list) {
      if (!item.symbol.endsWith("USDT") || item.symbol.includes("-")) continue;
      const funding = num(item.fundingRate);
      if (funding === null) continue;
      const { base, multiplier } = parseContract(item.symbol.slice(0, -4));
      addQuote(book, base, {
        funding,
        unitPrice: unitPrice(num(item.markPrice), multiplier),
        intervalHours: num(item.fundingIntervalHour) ?? 8,
        oiUsd: num(item.openInterestValue),
        nextFundingTime: num(item.nextFundingTime),
      });
    }
    if (!Object.keys(book).length) throw new Error("empty");
    cacheLife(SUCCESS_LIFE);
    return book;
  } catch {
    cacheLife(FAILURE_LIFE);
    return null;
  }
}

async function cachedOkxBook(): Promise<VenueBook | null> {
  "use cache";
  try {
    type Envelope<T> = { code: string; data: T[] };
    type Funding = { instId: string; fundingRate: string; fundingTime: string; nextFundingTime: string };
    const [funding, oi] = await Promise.all([
      getJson<Envelope<Funding>>("https://www.okx.com/api/v5/public/funding-rate?instId=ANY"),
      getJson<Envelope<{ instId: string; oiUsd: string; oiCcy: string }>>("https://www.okx.com/api/v5/public/open-interest?instType=SWAP").catch(() => null),
    ]);
    if (funding.code !== "0") throw new Error(funding.code);
    const oiByInst = new Map((oi?.data ?? []).map((item) => [item.instId, { usd: num(item.oiUsd), coins: num(item.oiCcy) }]));
    const book: VenueBook = {};
    for (const item of funding.data) {
      if (!item.instId.endsWith("-USDT-SWAP")) continue;
      const rate = num(item.fundingRate);
      if (rate === null) continue;
      const settle = num(item.fundingTime);
      const next = num(item.nextFundingTime);
      const { base } = parseContract(item.instId.split("-")[0]);
      const open = oiByInst.get(item.instId);
      addQuote(book, base, {
        funding: rate,
        unitPrice: open?.usd && open.coins ? open.usd / open.coins : null,
        intervalHours: settle && next ? Math.round((next - settle) / 3_600_000) || 8 : 8,
        oiUsd: open?.usd ?? null,
        nextFundingTime: settle,
      });
    }
    if (!Object.keys(book).length) throw new Error("empty");
    cacheLife(SUCCESS_LIFE);
    return book;
  } catch {
    cacheLife(FAILURE_LIFE);
    return null;
  }
}

async function cachedHyperliquidBook(): Promise<VenueBook | null> {
  "use cache";
  try {
    type Meta = { universe: { name: string; isDelisted?: boolean }[] };
    type Ctx = { funding: string; openInterest: string; markPx: string };
    const [meta, ctxs] = await getJson<[Meta, Ctx[]]>("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    });
    const nextHour = (Math.floor(Date.now() / 3_600_000) + 1) * 3_600_000;
    const book: VenueBook = {};
    meta.universe.forEach((asset, index) => {
      const ctx = ctxs[index];
      if (!ctx || asset.isDelisted) return;
      const funding = num(ctx.funding);
      const contracts = num(ctx.openInterest);
      const mark = num(ctx.markPx);
      if (funding === null) return;
      const { base, multiplier } = parseContract(asset.name, HYPERLIQUID_MULTIPLIER);
      addQuote(book, base, {
        funding,
        unitPrice: unitPrice(mark, multiplier),
        intervalHours: 1,
        oiUsd: contracts !== null && mark !== null ? contracts * mark : null,
        nextFundingTime: nextHour,
      });
    });
    if (!Object.keys(book).length) throw new Error("empty");
    cacheLife(SUCCESS_LIFE);
    return book;
  } catch {
    cacheLife(FAILURE_LIFE);
    return null;
  }
}

async function pool<T, R>(items: T[], size: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

type BinanceOi = Record<string, { oiUsd: number; change24h: number | null }>;

async function cachedBinanceOpenInterest(contractList: string): Promise<BinanceOi | null> {
  "use cache";
  const contracts = contractList.split(",").filter(Boolean);
  type Hist = { sumOpenInterest: string; sumOpenInterestValue: string; timestamp: number };
  const entries = await pool(contracts, 8, async (contract) => {
    try {
      const [current, history] = await Promise.all([
        getJson<{ openInterest: string }>(`${BINANCE}/fapi/v1/openInterest?symbol=${contract}`),
        getJson<Hist[]>(`${BINANCE}/futures/data/openInterestHist?symbol=${contract}&period=1h&limit=25`),
      ]);
      const latest = history[history.length - 1];
      const dayAgo = history.length >= 25 ? history[0] : null;
      const contractsOpen = num(current.openInterest);
      const latestContracts = num(latest?.sumOpenInterest);
      const latestValue = num(latest?.sumOpenInterestValue);
      if (contractsOpen === null || !latestContracts || latestValue === null) return null;
      const oiUsd = contractsOpen * (latestValue / latestContracts);
      const pastValue = num(dayAgo?.sumOpenInterestValue);
      const pastContracts = num(dayAgo?.sumOpenInterest);
      const change24h = pastContracts ? ((contractsOpen - pastContracts) / pastContracts) * 100 : pastValue ? ((oiUsd - pastValue) / pastValue) * 100 : null;
      return [contract, { oiUsd, change24h }] as const;
    } catch {
      return null;
    }
  });
  const found = entries.filter((entry) => entry !== null);
  if (!found.length) {
    cacheLife(FAILURE_LIFE);
    return null;
  }
  cacheLife({ stale: 120, revalidate: 300, expire: 1800 });
  return Object.fromEntries(found);
}

async function cachedBtcLongShort(): Promise<LongShortReading | null> {
  "use cache";
  try {
    const rows = await getJson<{ longAccount: string; shortAccount: string }[]>(
      `${BINANCE}/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1`,
    );
    const long = num(rows[0]?.longAccount);
    const short = num(rows[0]?.shortAccount);
    if (long === null || short === null) throw new Error("empty");
    cacheLife({ stale: 60, revalidate: 300, expire: 1800 });
    return { longPct: long * 100, shortPct: short * 100 };
  } catch {
    cacheLife(FAILURE_LIFE);
    return null;
  }
}

export function derivativesBase(symbol: string) {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function matchesSpot(contractPrice: number | null, spot: number | null) {
  if (contractPrice === null || spot === null || spot <= 0) return true;
  const ratio = contractPrice / spot;
  return ratio > 0.8 && ratio < 1.25;
}

function buildRow(coin: CoinMarket, venues: Partial<Record<Venue, VenueQuote>>, binanceOi: BinanceOi[string] | undefined): DerivativesRow {
  const quotes = VENUES.map((venue) => venues[venue]).filter((quote): quote is VenueQuote => Boolean(quote));
  const ois = quotes.map((quote) => quote.oiUsd).filter((value): value is number => value !== null);
  const totalOiUsd = ois.length ? ois.reduce((sum, value) => sum + value, 0) : null;
  const weightTotal = quotes.reduce((sum, quote) => sum + (quote.oiUsd ?? 0), 0);
  const avgFunding8h = !quotes.length
    ? null
    : weightTotal > 0
      ? quotes.reduce((sum, quote) => sum + toFunding8h(quote) * (quote.oiUsd ?? 0), 0) / weightTotal
      : quotes.reduce((sum, quote) => sum + toFunding8h(quote), 0) / quotes.length;
  const aprs = quotes.map(toFundingApr);
  return {
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    image: coin.image,
    rank: coin.market_cap_rank,
    price: coin.current_price,
    change24h: coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h,
    venues,
    totalOiUsd,
    oiChange24h: binanceOi?.change24h ?? null,
    avgFunding8h,
    spreadApr: aprs.length >= 2 ? Math.max(...aprs) - Math.min(...aprs) : null,
  };
}

async function cachedOverview(): Promise<DerivativesOverview> {
  "use cache";
  const [markets, binance, bybit, okx, hyperliquid, btcLongShort] = await Promise.all([
    getTopMarkets().catch(() => [] as CoinMarket[]),
    cachedBinanceBook(),
    cachedBybitBook(),
    cachedOkxBook(),
    cachedHyperliquidBook(),
    cachedBtcLongShort(),
  ]);
  const books: Record<Venue, VenueBook | null> = { Binance: binance, Bybit: bybit, OKX: okx, Hyperliquid: hyperliquid };

  const seen = new Set<string>();
  const candidates = markets.filter((coin) => {
    const base = derivativesBase(coin.symbol);
    if (!base || noPerpetualSymbols.has(base) || seen.has(base)) return false;
    seen.add(base);
    return true;
  });

  const binanceContracts = binance
    ? candidates
        .map((coin) => derivativesBase(coin.symbol))
        .filter((base) => binance[base])
        .map((base) => `${base}USDT`)
    : [];
  const binanceOi = binanceContracts.length ? await cachedBinanceOpenInterest(binanceContracts.join(",")) : null;

  const rows: DerivativesRow[] = [];
  for (const coin of candidates) {
    const base = derivativesBase(coin.symbol);
    const venues: Partial<Record<Venue, VenueQuote>> = {};
    for (const venue of VENUES) {
      const quote = books[venue]?.[base];
      if (quote && matchesSpot(quote.unitPrice, coin.current_price)) {
        venues[venue] = { funding: quote.funding, intervalHours: quote.intervalHours, oiUsd: quote.oiUsd, nextFundingTime: quote.nextFundingTime };
      }
    }
    if (!Object.keys(venues).length) continue;
    const oi = binanceOi?.[`${base}USDT`];
    if (venues.Binance && oi) venues.Binance = { ...venues.Binance, oiUsd: oi.oiUsd };
    rows.push(buildRow(coin, venues, oi));
  }

  const totalOiUsd = rows.reduce((sum, row) => sum + (row.totalOiUsd ?? 0), 0);
  const weighted = rows.filter((row) => row.avgFunding8h !== null && row.totalOiUsd);
  const weightSum = weighted.reduce((sum, row) => sum + (row.totalOiUsd ?? 0), 0);

  return {
    rows,
    venuesOnline: VENUES.filter((venue) => books[venue] !== null),
    totalOiUsd,
    weightedFunding8h: weightSum > 0 ? weighted.reduce((sum, row) => sum + (row.avgFunding8h ?? 0) * (row.totalOiUsd ?? 0), 0) / weightSum : null,
    btcLongShort,
    updatedAt: new Date().toISOString(),
  };
}

export function getDerivativesOverview() {
  return cachedOverview();
}
