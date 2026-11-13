export type FeeType = "percent" | "flat";

export interface Fee {
  type: FeeType;
  value: number;
}

export interface ProfitInput {
  buyPrice: number;
  buyQuantity: number;
  sellPrice: number;
  sellQuantity: number;
  buyFee: Fee;
  sellFee: Fee;
  taxRate: number;
}

export interface ProfitResult {
  buyValue: number;
  buyFeeAmount: number;
  totalCost: number;
  costPerCoin: number;
  soldCostBasis: number;
  sellValue: number;
  sellFeeAmount: number;
  totalRevenue: number;
  netProfit: number;
  roi: number;
  breakEvenPrice: number | null;
  estimatedTax: number;
  profitAfterTax: number;
  remainingQuantity: number;
  remainingCostBasis: number;
}

export type ProfitOutcome = { ok: true; result: ProfitResult } | { ok: false; problem: string };

function feeAmount(fee: Fee, tradeValue: number) {
  const value = Math.max(0, fee.value);
  return fee.type === "percent" ? (tradeValue * value) / 100 : value;
}

export function calculateProfit(input: ProfitInput): ProfitOutcome {
  const { buyPrice, buyQuantity, sellPrice, sellQuantity, buyFee, sellFee, taxRate } = input;

  if (!(buyPrice > 0) || !(buyQuantity > 0)) return { ok: false, problem: "Enter a purchase price and quantity above zero." };
  if (!(sellPrice >= 0) || !(sellQuantity > 0)) return { ok: false, problem: "Enter a selling price and the quantity you sold." };
  if (sellQuantity > buyQuantity) return { ok: false, problem: "You can't sell more coins than you bought." };
  if (buyFee.type === "percent" && buyFee.value >= 100) return { ok: false, problem: "A percentage fee must be below 100%." };
  if (sellFee.type === "percent" && sellFee.value >= 100) return { ok: false, problem: "A percentage fee must be below 100%." };

  const buyValue = buyPrice * buyQuantity;
  const buyFeeAmount = feeAmount(buyFee, buyValue);
  const totalCost = buyValue + buyFeeAmount;
  const costPerCoin = totalCost / buyQuantity;
  const soldShare = sellQuantity / buyQuantity;
  const soldCostBasis = totalCost * soldShare;

  const sellValue = sellPrice * sellQuantity;
  const sellFeeAmount = feeAmount(sellFee, sellValue);
  const totalRevenue = sellValue - sellFeeAmount;
  const netProfit = totalRevenue - soldCostBasis;
  const roi = (netProfit / soldCostBasis) * 100;

  const breakEvenPrice =
    sellFee.type === "percent"
      ? costPerCoin / (1 - Math.max(0, sellFee.value) / 100)
      : (soldCostBasis + Math.max(0, sellFee.value)) / sellQuantity;

  const rate = Math.min(100, Math.max(0, taxRate));
  const estimatedTax = netProfit > 0 ? (netProfit * rate) / 100 : 0;

  return {
    ok: true,
    result: {
      buyValue,
      buyFeeAmount,
      totalCost,
      costPerCoin,
      soldCostBasis,
      sellValue,
      sellFeeAmount,
      totalRevenue,
      netProfit,
      roi,
      breakEvenPrice: Number.isFinite(breakEvenPrice) ? breakEvenPrice : null,
      estimatedTax,
      profitAfterTax: netProfit - estimatedTax,
      remainingQuantity: buyQuantity - sellQuantity,
      remainingCostBasis: totalCost - soldCostBasis,
    },
  };
}
