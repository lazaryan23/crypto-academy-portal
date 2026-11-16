export type SignalType = "longs-entering" | "shorts-closing" | "shorts-entering" | "longs-closing" | "neutral";

export interface SignalInfo {
  type: SignalType;
  label: string;
  bias: "Bullish" | "Bullish reversal" | "Bearish" | "Bearish capitulation" | "No clear signal";
  color: string;
  price: "up" | "down" | null;
  oi: "up" | "down" | null;
  description: string;
}

export const SIGNALS: Record<SignalType, SignalInfo> = {
  "longs-entering": {
    type: "longs-entering",
    label: "Longs entering",
    bias: "Bullish",
    color: "teal",
    price: "up",
    oi: "up",
    description: "Price and open interest rising together: new leveraged longs are opening and backing the move.",
  },
  "shorts-closing": {
    type: "shorts-closing",
    label: "Short squeeze",
    bias: "Bullish reversal",
    color: "lime",
    price: "up",
    oi: "down",
    description: "Price rising while open interest falls: shorts are closing or being liquidated, often a squeeze rather than fresh demand.",
  },
  "shorts-entering": {
    type: "shorts-entering",
    label: "Shorts entering",
    bias: "Bearish",
    color: "red",
    price: "down",
    oi: "up",
    description: "Price falling while open interest rises: new shorts are pressing the move lower.",
  },
  "longs-closing": {
    type: "longs-closing",
    label: "Longs liquidating",
    bias: "Bearish capitulation",
    color: "orange",
    price: "down",
    oi: "down",
    description: "Price and open interest falling together: longs are closing or being liquidated, a flush that can mark capitulation.",
  },
  neutral: {
    type: "neutral",
    label: "No clear signal",
    bias: "No clear signal",
    color: "gray",
    price: null,
    oi: null,
    description: "Price or open interest barely moved, so positioning gives no clear read.",
  },
};

export const SIGNAL_ORDER: Exclude<SignalType, "neutral">[] = ["longs-entering", "shorts-closing", "shorts-entering", "longs-closing"];

export type SignalWindow = "24h" | "4h";

export const DEADBANDS: Record<SignalWindow, { price: number; oi: number }> = {
  "24h": { price: 0.3, oi: 0.5 },
  "4h": { price: 0.15, oi: 0.25 },
};

export function classifySignal(priceChange: number | null, oiChange: number | null, window: SignalWindow = "24h"): SignalType {
  if (priceChange == null || oiChange == null) return "neutral";
  const band = DEADBANDS[window];
  if (Math.abs(priceChange) < band.price || Math.abs(oiChange) < band.oi) return "neutral";
  if (priceChange > 0) return oiChange > 0 ? "longs-entering" : "shorts-closing";
  return oiChange > 0 ? "shorts-entering" : "longs-closing";
}

export function signalStrength(priceChange: number | null, oiChange: number | null) {
  if (priceChange == null || oiChange == null) return 0;
  return Math.sqrt(Math.abs(priceChange) * Math.abs(oiChange));
}
