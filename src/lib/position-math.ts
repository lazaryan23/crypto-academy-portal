export type Direction = "long" | "short";

export const MAINTENANCE_MARGIN_RATE = 0.005;

export interface PositionInput {
  balance: number;
  riskPct: number;
  entry: number;
  stop: number;
  takeProfit: number | null;
  leverage: number;
  direction: Direction;
}

export interface PositionResult {
  valid: boolean;
  issues: string[];
  riskUsd: number;
  stopDistancePct: number;
  positionUsd: number;
  quantity: number;
  marginUsd: number;
  liquidationPrice: number;
  liquidationDistancePct: number;
  lossAtStopUsd: number;
  profitAtTargetUsd: number | null;
  riskReward: number | null;
  minLeverage: number;
  liquidatesBeforeStop: boolean;
  marginExceedsBalance: boolean;
}

export function liquidationPrice(entry: number, leverage: number, direction: Direction, mmr = MAINTENANCE_MARGIN_RATE) {
  const move = 1 / leverage - mmr;
  return direction === "long" ? entry * (1 - move) : entry * (1 + move);
}

export function calculatePosition(input: PositionInput): PositionResult {
  const { balance, riskPct, entry, stop, takeProfit, leverage, direction } = input;
  const issues: string[] = [];
  if (!(balance > 0)) issues.push("Enter an account balance above zero.");
  if (!(riskPct > 0)) issues.push("Enter a risk percentage above zero.");
  if (!(entry > 0) || !(stop > 0)) issues.push("Enter entry and stop-loss prices.");
  if (entry > 0 && stop > 0) {
    if (direction === "long" && stop >= entry) issues.push("For a long, the stop-loss must be below the entry price.");
    if (direction === "short" && stop <= entry) issues.push("For a short, the stop-loss must be above the entry price.");
  }
  if (takeProfit !== null && takeProfit > 0 && entry > 0) {
    if (direction === "long" && takeProfit <= entry) issues.push("For a long, the take-profit must be above the entry price.");
    if (direction === "short" && takeProfit >= entry) issues.push("For a short, the take-profit must be below the entry price.");
  }

  const riskUsd = (balance * riskPct) / 100;
  const stopDistance = entry > 0 ? Math.abs(entry - stop) / entry : 0;
  const positionUsd = stopDistance > 0 ? riskUsd / stopDistance : 0;
  const quantity = entry > 0 ? positionUsd / entry : 0;
  const lev = Math.max(1, leverage);
  const marginUsd = positionUsd / lev;
  const liq = entry > 0 ? liquidationPrice(entry, lev, direction) : 0;
  const hasTarget = takeProfit !== null && takeProfit > 0;
  const profitAtTargetUsd = hasTarget ? quantity * Math.abs(takeProfit - entry) : null;
  const liquidatesBeforeStop = entry > 0 && stop > 0 && (direction === "long" ? liq >= stop : liq <= stop);

  return {
    valid: issues.length === 0,
    issues,
    riskUsd,
    stopDistancePct: stopDistance * 100,
    positionUsd,
    quantity,
    marginUsd,
    liquidationPrice: liq,
    liquidationDistancePct: entry > 0 ? (Math.abs(entry - liq) / entry) * 100 : 0,
    lossAtStopUsd: quantity * Math.abs(entry - stop),
    profitAtTargetUsd,
    riskReward: hasTarget && stopDistance > 0 ? Math.abs(takeProfit - entry) / Math.abs(entry - stop) : null,
    minLeverage: balance > 0 ? Math.max(1, Math.ceil(positionUsd / balance)) : 1,
    liquidatesBeforeStop,
    marginExceedsBalance: marginUsd > balance,
  };
}
