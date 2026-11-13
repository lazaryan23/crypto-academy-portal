import type { ChartPoint } from "@/types/coingecko";

export type Frequency = "weekly" | "monthly";

export interface DcaPoint {
  time: number;
  value: number;
  invested: number;
}

export interface DcaResult {
  startTime: number;
  buys: number;
  invested: number;
  units: number;
  value: number;
  profit: number;
  roi: number;
  averageCost: number;
  lastPrice: number;
  lumpSumValue: number;
  lumpSumRoi: number;
  series: DcaPoint[];
}

const DAY_MS = 86_400_000;

function nextBuyTime(time: number, frequency: Frequency) {
  if (frequency === "weekly") return time + 7 * DAY_MS;
  const date = new Date(time);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.getTime();
}

export function runDca(points: ChartPoint[], amount: number, frequency: Frequency, months: number): DcaResult | null {
  if (!points.length || amount <= 0) return null;
  const sorted = [...points].sort((x, y) => x[0] - y[0]);
  const last = sorted[sorted.length - 1];
  const start = new Date(last[0]);
  start.setUTCMonth(start.getUTCMonth() - months);
  const window = sorted.filter(([t, p]) => t >= start.getTime() && p > 0);
  if (window.length < 2) return null;

  let buyAt = window[0][0];
  let units = 0;
  let invested = 0;
  let buys = 0;
  const series: DcaPoint[] = [];

  for (const [time, price] of window) {
    while (time >= buyAt) {
      units += amount / price;
      invested += amount;
      buys += 1;
      buyAt = nextBuyTime(buyAt, frequency);
    }
    series.push({ time, value: units * price, invested });
  }

  const lastPrice = window[window.length - 1][1];
  const value = units * lastPrice;
  const lumpSumValue = (invested / window[0][1]) * lastPrice;
  return {
    startTime: window[0][0],
    buys,
    invested,
    units,
    value,
    profit: value - invested,
    roi: ((value - invested) / invested) * 100,
    averageCost: invested / units,
    lastPrice,
    lumpSumValue,
    lumpSumRoi: ((lumpSumValue - invested) / invested) * 100,
    series,
  };
}
