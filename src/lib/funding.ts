export const VENUES = ["Binance", "Bybit", "OKX", "Hyperliquid"] as const;
export type Venue = (typeof VENUES)[number];

export interface VenueQuote {
  funding: number;
  intervalHours: number;
  oiUsd: number | null;
  nextFundingTime: number | null;
}

export function toFunding8h(quote: Pick<VenueQuote, "funding" | "intervalHours">) {
  return quote.funding * (8 / quote.intervalHours);
}

export function toFundingApr(quote: Pick<VenueQuote, "funding" | "intervalHours">) {
  return quote.funding * (24 / quote.intervalHours) * 365 * 100;
}

export function funding8hToApr(rate8h: number) {
  return rate8h * 3 * 365 * 100;
}

const MULTIPLIER = /^(1000000|100000|10000|1000|100)(?=[A-Z])/;
const SUFFIX_MULTIPLIER = /(?<=[A-Z]{2})(1000)$/;
export const HYPERLIQUID_MULTIPLIER = /^k()(?=[A-Z])/;

export function parseContract(raw: string, pattern = MULTIPLIER) {
  const suffix = raw.match(SUFFIX_MULTIPLIER);
  if (suffix) return { base: raw.slice(0, -suffix[0].length), multiplier: Number(suffix[0]) };
  const match = raw.match(pattern);
  const multiplier = match ? (match[1] ? Number(match[1]) : 1000) : 1;
  return { base: raw.replace(pattern, ""), multiplier };
}
