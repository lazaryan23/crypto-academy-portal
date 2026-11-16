export const CORRELATION_WINDOWS = [30, 90] as const;
export type CorrelationWindow = (typeof CORRELATION_WINDOWS)[number];

export interface CorrelationAsset {
  key: string;
  label: string;
  name: string;
  group: "crypto" | "tradfi";
}

export const CORRELATION_ASSETS: CorrelationAsset[] = [
  { key: "BTC-USD", label: "BTC", name: "Bitcoin", group: "crypto" },
  { key: "ETH-USD", label: "ETH", name: "Ethereum", group: "crypto" },
  { key: "SOL-USD", label: "SOL", name: "Solana", group: "crypto" },
  { key: "GC=F", label: "Gold", name: "Gold futures", group: "tradfi" },
  { key: "^GSPC", label: "S&P 500", name: "S&P 500 index", group: "tradfi" },
  { key: "^IXIC", label: "Nasdaq", name: "Nasdaq Composite", group: "tradfi" },
  { key: "DX-Y.NYB", label: "DXY", name: "US Dollar Index", group: "tradfi" },
];

export interface CorrelationSnapshot {
  assets: CorrelationAsset[];
  matrices: Record<CorrelationWindow, (number | null)[][]>;
  observations: Record<CorrelationWindow, number>;
  lastDate: string;
  updatedAt: string;
}
