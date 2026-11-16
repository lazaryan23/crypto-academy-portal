export type DailySeries = Map<string, number>;

export function commonDates(series: DailySeries[]) {
  if (!series.length) return [];
  return [...series[0].keys()].filter((date) => series.every((s) => s.has(date))).sort();
}

export function logReturns(values: number[]) {
  const out: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    const cur = values[i];
    out.push(prev > 0 && cur > 0 ? Math.log(cur / prev) : 0);
  }
  return out;
}

export function pearson(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return null;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  if (varA === 0 || varB === 0) return null;
  return cov / Math.sqrt(varA * varB);
}

export function correlationMatrix(returns: number[][], window: number) {
  const tail = returns.map((series) => series.slice(-window));
  return tail.map((a, i) => tail.map((b, j) => (i === j ? 1 : pearson(a, b))));
}

export function describeCorrelation(r: number | null) {
  if (r === null) return { label: "Not enough data", strength: "none" as const };
  const abs = Math.abs(r);
  const direction = r >= 0 ? "positive" : "negative";
  if (abs >= 0.7) return { label: `Strong ${direction}`, strength: "strong" as const };
  if (abs >= 0.4) return { label: `Moderate ${direction}`, strength: "moderate" as const };
  if (abs >= 0.2) return { label: `Weak ${direction}`, strength: "weak" as const };
  return { label: "Little to no relationship", strength: "none" as const };
}
