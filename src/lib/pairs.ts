import type { ChartPoint } from "@/types/coingecko";

export const popularPairs: [string, string][] = [
  ["bitcoin", "ethereum"],
  ["bitcoin", "solana"],
  ["ethereum", "solana"],
  ["bitcoin", "binancecoin"],
  ["bitcoin", "ripple"],
  ["ethereum", "binancecoin"],
  ["solana", "the-open-network"],
  ["ripple", "cardano"],
  ["cardano", "solana"],
  ["dogecoin", "solana"],
];

export const pairCoinNames: Record<string, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  solana: "Solana",
  "the-open-network": "Toncoin",
  binancecoin: "BNB",
  ripple: "XRP",
  cardano: "Cardano",
  dogecoin: "Dogecoin",
};

const coinIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function pairSlug(a: string, b: string) {
  return `${a}-vs-${b}`;
}

export function parsePair(slug: string): [string, string] | null {
  const parts = slug.toLowerCase().split("-vs-");
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (!coinIdPattern.test(a) || !coinIdPattern.test(b) || a === b) return null;
  return [a, b];
}

export function canonicalPairSlug(a: string, b: string) {
  const reversedPopular = popularPairs.some(([x, y]) => x === b && y === a);
  return reversedPopular ? pairSlug(b, a) : pairSlug(a, b);
}

export function pairsFor(id: string, limit = 4): [string, string][] {
  const popular = popularPairs.filter(([a, b]) => a === id || b === id);
  const extra: [string, string][] = id === "bitcoin" ? [] : [["bitcoin", id]];
  const seen = new Set<string>();
  return [...popular, ...extra]
    .filter(([a, b]) => {
      const key = [a, b].sort().join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function periodReturn(points: ChartPoint[] | null | undefined, sinceMs?: number): number | null {
  if (!points?.length) return null;
  const start = sinceMs === undefined ? points[0] : points.find(([t]) => t >= sinceMs);
  const end = points[points.length - 1];
  if (!start || !start[1]) return null;
  return ((end[1] - start[1]) / start[1]) * 100;
}
