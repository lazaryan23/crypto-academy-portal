export const LONG_SHORT_COINS = ["BTC", "ETH", "SOL", "XRP", "DOGE"] as const;
export type LongShortCoin = (typeof LONG_SHORT_COINS)[number];

export const LONG_SHORT_TIMEFRAMES = ["1h", "4h", "24h"] as const;
export type LongShortTimeframe = (typeof LONG_SHORT_TIMEFRAMES)[number];

export const LONG_SHORT_EXCHANGES = ["Binance", "Bybit", "OKX"] as const;
export type LongShortExchange = (typeof LONG_SHORT_EXCHANGES)[number];

export interface ExchangeLongShort {
  exchange: LongShortExchange;
  longPct: number;
  latestLongPct: number;
  samples: number;
}

export interface LongShortSnapshot {
  coin: LongShortCoin;
  timeframe: LongShortTimeframe;
  longPct: number | null;
  exchanges: ExchangeLongShort[];
  updatedAt: string;
}

export function isLongShortCoin(value: string): value is LongShortCoin {
  return (LONG_SHORT_COINS as readonly string[]).includes(value);
}

export function isLongShortTimeframe(value: string): value is LongShortTimeframe {
  return (LONG_SHORT_TIMEFRAMES as readonly string[]).includes(value);
}
