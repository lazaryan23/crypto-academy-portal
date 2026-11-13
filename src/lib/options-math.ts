export const OPTION_CURRENCIES = ["BTC", "ETH"] as const;
export type OptionCurrency = (typeof OPTION_CURRENCIES)[number];

export interface StrikeRow {
  strike: number;
  callOi: number;
  putOi: number;
}

export interface ExpirySummary {
  code: string;
  expiry: number;
  callOi: number;
  putOi: number;
  callVolume: number;
  putVolume: number;
  notionalUsd: number;
  maxPain: number | null;
  atmIv: number | null;
  strikes: StrikeRow[];
}

export interface OptionsOverview {
  currency: OptionCurrency;
  indexPrice: number;
  callOi: number;
  putOi: number;
  callVolume: number;
  putVolume: number;
  expiries: ExpirySummary[];
  dvol: { current: number; change24h: number | null; history: [number, number][] } | null;
  updatedAt: string;
}

export function isOptionCurrency(value: unknown): value is OptionCurrency {
  return typeof value === "string" && (OPTION_CURRENCIES as readonly string[]).includes(value);
}

export function maxPain(strikes: StrikeRow[]): number | null {
  if (!strikes.length) return null;
  let best: { strike: number; payout: number } | null = null;
  for (const candidate of strikes) {
    let payout = 0;
    for (const row of strikes) {
      if (candidate.strike > row.strike) payout += row.callOi * (candidate.strike - row.strike);
      if (candidate.strike < row.strike) payout += row.putOi * (row.strike - candidate.strike);
    }
    if (!best || payout < best.payout) best = { strike: candidate.strike, payout };
  }
  return best?.strike ?? null;
}

export function mergeStrikes(expiries: ExpirySummary[]): StrikeRow[] {
  const byStrike = new Map<number, StrikeRow>();
  for (const expiry of expiries) {
    for (const row of expiry.strikes) {
      const existing = byStrike.get(row.strike) ?? { strike: row.strike, callOi: 0, putOi: 0 };
      existing.callOi += row.callOi;
      existing.putOi += row.putOi;
      byStrike.set(row.strike, existing);
    }
  }
  return [...byStrike.values()].sort((a, b) => a.strike - b.strike);
}

export function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

export function expectedDailyMove(dvol: number) {
  return dvol / Math.sqrt(365);
}

export function formatStrike(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: value < 100 ? 2 : 0 })}`;
}
