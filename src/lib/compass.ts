import { cacheLife } from "next/cache";
import { getDerivativesOverview, noPerpetualSymbols } from "@/lib/derivatives-market";
import { parseContract } from "@/lib/funding";
import { MINUTE_MS, SERIES_MINUTES, type CompassCoin, type CompassSnapshot } from "@/lib/buy-pressure";

const BINANCE = "https://fapi.binance.com";
const TIMEOUT_MS = 8000;
const TRACKED_COINS = 40;
const KLINE_BATCH = 10;
const MIN_MATCHED_COINS = 15;

interface Candidate {
  id: string;
  symbol: string;
  name: string;
  image: string;
  rank: number | null;
  linked: boolean;
}

type Kline = [number, string, string, string, string, string, number, string, number, string, string, string];
type Ticker = { symbol: string; quoteVolume: string; lastPrice: string };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

function num(value: string | number | undefined) {
  const n = typeof value === "string" ? Number(value) : (value ?? NaN);
  return Number.isFinite(n) ? n : 0;
}

function roundPrice(value: number) {
  return Number(value.toPrecision(6));
}

type ExchangeSymbol = { symbol: string; status: string; contractType: string; underlyingType: string; quoteAsset: string };

async function cachedCryptoPerpetuals(): Promise<string[] | null> {
  "use cache";
  try {
    const info = await getJson<{ symbols: ExchangeSymbol[] }>(`${BINANCE}/fapi/v1/exchangeInfo`);
    const symbols = info.symbols
      .filter((s) => s.status === "TRADING" && s.contractType === "PERPETUAL" && s.underlyingType === "COIN" && s.quoteAsset === "USDT")
      .map((s) => s.symbol);
    if (!symbols.length) throw new Error("empty");
    cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
    return symbols;
  } catch {
    cacheLife({ stale: 0, revalidate: 60, expire: 600 });
    return null;
  }
}

async function binanceContracts(): Promise<Map<string, { contract: string; quoteVolume: number }>> {
  const [tickers, perpetuals] = await Promise.all([getJson<Ticker[]>(`${BINANCE}/fapi/v1/ticker/24hr`), cachedCryptoPerpetuals()]);
  if (!perpetuals) throw new Error("exchangeInfo unavailable");
  const crypto = new Set(perpetuals);
  const byBase = new Map<string, { contract: string; quoteVolume: number }>();
  for (const ticker of tickers) {
    if (!crypto.has(ticker.symbol)) continue;
    const { base } = parseContract(ticker.symbol.slice(0, -4));
    const quoteVolume = num(ticker.quoteVolume);
    const existing = byBase.get(base);
    if (!existing || quoteVolume > existing.quoteVolume) byBase.set(base, { contract: ticker.symbol, quoteVolume });
  }
  return byBase;
}

async function minuteSeries(contract: string) {
  const klines = await getJson<Kline[]>(`${BINANCE}/fapi/v1/klines?symbol=${contract}&interval=1m&limit=${SERIES_MINUTES}`);
  if (!klines.length) return null;
  return {
    start: klines[0][0],
    qv: klines.map((k) => Math.round(num(k[7]))),
    tb: klines.map((k) => Math.round(num(k[10]))),
    c: klines.map((k) => roundPrice(num(k[4]))),
  };
}

async function cachedSnapshot(): Promise<CompassSnapshot | null> {
  "use cache";
  try {
    const [overview, contracts] = await Promise.all([getDerivativesOverview(), binanceContracts()]);
    const matched: Candidate[] = overview.rows
      .filter((row) => row.venues.Binance && contracts.has(row.symbol))
      .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
      .map((row) => ({ id: row.id, symbol: row.symbol, name: row.name, image: row.image, rank: row.rank, linked: true }));
    const candidates: Candidate[] = (
      matched.length >= MIN_MATCHED_COINS
        ? matched
        : [...contracts.entries()]
            .filter(([base]) => !noPerpetualSymbols.has(base))
            .sort((a, b) => b[1].quoteVolume - a[1].quoteVolume)
            .map(([base]) => ({ id: base.toLowerCase(), symbol: base, name: base, image: "", rank: null, linked: false }))
    ).slice(0, TRACKED_COINS);

    const coins: CompassCoin[] = [];
    for (let i = 0; i < candidates.length; i += KLINE_BATCH) {
      const batch = candidates.slice(i, i + KLINE_BATCH);
      const results = await Promise.all(
        batch.map(async (row) => {
          const meta = contracts.get(row.symbol)!;
          const series = await minuteSeries(meta.contract).catch(() => null);
          if (!series) return null;
          return {
            id: row.id,
            symbol: row.symbol,
            name: row.name,
            image: row.image,
            rank: row.rank,
            linked: row.linked,
            contract: meta.contract,
            baselinePerMin: Math.round(meta.quoteVolume / 1440),
            series,
          } satisfies CompassCoin;
        }),
      );
      coins.push(...results.filter((coin): coin is CompassCoin => coin !== null));
    }

    if (coins.length < 5) throw new Error("too few coins");
    cacheLife({ stale: 15, revalidate: 30, expire: 300 });
    return { asOf: Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS, source: "Binance USDT-M perpetuals", coins };
  } catch {
    cacheLife({ stale: 0, revalidate: 15, expire: 120 });
    return null;
  }
}

export function getCompassSnapshot() {
  return cachedSnapshot();
}
