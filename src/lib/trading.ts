export type Side = "long" | "short";

export const MAINTENANCE_MARGIN = 0.005;

export function riskLevel(leverage: number) {
  if (leverage <= 3) return { label: "Conservative", color: "teal" };
  if (leverage <= 10) return { label: "Moderate", color: "yellow" };
  if (leverage <= 25) return { label: "Aggressive", color: "orange" };
  return { label: "Extreme", color: "red" };
}

export function moveToLiquidation(leverage: number): number {
  return Math.max(0, 1 / leverage - MAINTENANCE_MARGIN);
}

export function liquidationPrice(side: Side, entry: number, leverage: number): number | null {
  if (side === "long" && leverage <= 1) return null;
  const move = moveToLiquidation(leverage);
  return side === "long" ? entry * (1 - move) : entry * (1 + move);
}

export function roundPrice(value: number): number {
  return Number(value.toPrecision(6));
}

export function priceDecimals(price: number): number {
  return price >= 1000 ? 2 : price >= 1 ? 4 : price >= 0.01 ? 6 : 8;
}

export interface TradePlanInput {
  side: Side;
  account: number;
  riskPct: number;
  entry: number;
  stop: number;
  target: number;
  leverage: number;
}

export interface TradePlan {
  valid: boolean;
  problem: string | null;
  riskAmount: number;
  stopDistance: number;
  targetDistance: number;
  positionSize: number;
  quantity: number;
  margin: number;
  profitAtTarget: number;
  rewardRisk: number;
  liquidation: number | null;
  liquidatesBeforeStop: boolean;
  marginExceedsAccount: boolean;
}

export function planTrade({ side, account, riskPct, entry, stop, target, leverage }: TradePlanInput): TradePlan {
  const long = side === "long";
  const riskAmount = (account * riskPct) / 100;
  const stopDistance = entry > 0 ? Math.abs(entry - stop) / entry : 0;
  const targetDistance = entry > 0 ? Math.abs(target - entry) / entry : 0;
  const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;
  const liquidation = entry > 0 ? liquidationPrice(side, entry, leverage) : null;

  let problem: string | null = null;
  if (entry <= 0 || account <= 0 || riskPct <= 0) problem = "Enter an account size, risk and entry price above zero.";
  else if (long ? stop >= entry : stop <= entry) problem = `For a ${side}, the stop-loss must be ${long ? "below" : "above"} the entry price.`;
  else if (long ? target <= entry : target >= entry) problem = `For a ${side}, the take-profit must be ${long ? "above" : "below"} the entry price.`;

  return {
    valid: problem === null,
    problem,
    riskAmount,
    stopDistance,
    targetDistance,
    positionSize,
    quantity: entry > 0 ? positionSize / entry : 0,
    margin: positionSize / Math.max(leverage, 1),
    profitAtTarget: positionSize * targetDistance,
    rewardRisk: stopDistance > 0 ? targetDistance / stopDistance : 0,
    liquidation,
    liquidatesBeforeStop: liquidation !== null && (long ? liquidation >= stop : liquidation <= stop),
    marginExceedsAccount: positionSize / Math.max(leverage, 1) > account,
  };
}
