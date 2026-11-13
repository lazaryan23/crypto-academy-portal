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
