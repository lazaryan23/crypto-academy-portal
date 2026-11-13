import { parseContract } from "@/lib/funding";

export const LIQUIDATION_EXCHANGES = ["Binance", "Bybit", "OKX"] as const;
export type LiquidationExchange = (typeof LIQUIDATION_EXCHANGES)[number];
export type LiquidationSide = "long" | "short";

export interface LiquidationEvent {
  id: string;
  exchange: LiquidationExchange;
  base: string;
  side: LiquidationSide;
  price: number;
  usd: number;
  time: number;
}

export type ContractValues = Record<string, number>;

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

function event(exchange: LiquidationExchange, base: string, side: LiquidationSide, price: number | null, usd: number | null, time: number | null): LiquidationEvent | null {
  if (!base || price === null || price <= 0 || usd === null || usd <= 0 || time === null) return null;
  return { id: `${exchange}:${base}:${side}:${time}:${usd.toFixed(2)}`, exchange, base, side, price, usd, time };
}

type BinanceForceOrder = { e?: string; o?: { s: string; S: string; ap: string; p: string; z: string; q: string; T: number } };

export function parseBinance(raw: unknown): LiquidationEvent[] {
  const message = raw as BinanceForceOrder;
  const order = message.o;
  if (message.e !== "forceOrder" || !order || !order.s.endsWith("USDT")) return [];
  const { base, multiplier } = parseContract(order.s.slice(0, -4));
  const qty = num(order.z) || num(order.q);
  const contractPrice = num(order.ap) || num(order.p);
  if (qty === null || contractPrice === null) return [];
  const parsed = event("Binance", base, order.S === "SELL" ? "long" : "short", contractPrice / multiplier, qty * contractPrice, num(order.T));
  return parsed ? [parsed] : [];
}

type BybitLiquidation = { topic?: string; data?: { T: number; s: string; S: string; v: string; p: string }[] };

export function parseBybit(raw: unknown, bases: Record<string, string>): LiquidationEvent[] {
  const message = raw as BybitLiquidation;
  if (!message.topic?.startsWith("allLiquidation.") || !Array.isArray(message.data)) return [];
  return message.data.flatMap((item) => {
    const qty = num(item.v);
    const contractPrice = num(item.p);
    if (qty === null || contractPrice === null) return [];
    const base = bases[item.s] ?? parseContract(item.s.replace(/USDT$/, "")).base;
    const { multiplier } = parseContract(item.s.replace(/USDT$/, ""));
    const parsed = event("Bybit", base, item.S === "Buy" ? "long" : "short", contractPrice / multiplier, qty * contractPrice, num(item.T));
    return parsed ? [parsed] : [];
  });
}

type OkxDetail = { posSide: string; side: string; sz: string; bkPx: string; ts: string };
type OkxLiquidation = { arg?: { channel?: string }; data?: { instId: string; details: OkxDetail[] }[] };

export function okxEvents(instId: string, details: OkxDetail[], contractValues: ContractValues): LiquidationEvent[] {
  if (!instId.endsWith("-USDT-SWAP")) return [];
  const base = instId.split("-")[0];
  const ctVal = contractValues[base];
  if (!ctVal) return [];
  return details.flatMap((detail) => {
    const size = num(detail.sz);
    const price = num(detail.bkPx);
    const side: LiquidationSide = detail.posSide === "long" || (detail.posSide === "net" && detail.side === "sell") ? "long" : "short";
    const parsed = event("OKX", base, side, price, size !== null && price !== null ? size * ctVal * price : null, num(detail.ts));
    return parsed ? [parsed] : [];
  });
}

export function parseOkx(raw: unknown, contractValues: ContractValues): LiquidationEvent[] {
  const message = raw as OkxLiquidation;
  if (message.arg?.channel !== "liquidation-orders" || !Array.isArray(message.data)) return [];
  return message.data.flatMap((item) => okxEvents(item.instId, item.details ?? [], contractValues));
}

export interface LiquidationTally {
  longUsd: number;
  shortUsd: number;
  count: number;
}

export function emptyTally(): LiquidationTally {
  return { longUsd: 0, shortUsd: 0, count: 0 };
}

export function addToTally(tally: LiquidationTally, item: Pick<LiquidationEvent, "side" | "usd">) {
  if (item.side === "long") tally.longUsd += item.usd;
  else tally.shortUsd += item.usd;
  tally.count += 1;
}
