export type Impact = "high" | "medium" | "low";

export interface UnlockEvent {
  kind: "unlock";
  id: string;
  date: number;
  coinId: string;
  symbol: string;
  name: string;
  image: string | null;
  tokens: number;
  usd: number | null;
  pctOfCirculating: number | null;
  recipients: string[];
  impact: Impact;
}

export interface MacroEvent {
  kind: "macro";
  id: string;
  date: number;
  title: string;
  country: string;
  forecast: string | null;
  previous: string | null;
  impact: Impact;
  source: string;
}

export type CalendarEvent = UnlockEvent | MacroEvent;

export interface CalendarSnapshot {
  events: CalendarEvent[];
  macroCoverageUntil: number | null;
  updatedAt: string;
}

export function unlockImpact(pctOfCirculating: number | null, usd: number | null): Impact {
  const pct = pctOfCirculating ?? 0;
  const value = usd ?? 0;
  if (pct >= 2 || value >= 50_000_000) return "high";
  if (pct >= 0.5 || value >= 10_000_000) return "medium";
  return "low";
}
