export const ETF_ASSETS = ["BTC", "ETH"] as const;
export type EtfAsset = (typeof ETF_ASSETS)[number];

export interface EtfFlowDay {
  date: string;
  netFlowUsd: number;
}

export interface EtfIssuerFlow {
  ticker: string;
  issuer: string;
  dailyFlowUsd: number;
  netAssetsUsd: number | null;
}

export interface EtfFlows {
  asset: EtfAsset;
  source: "sosovalue" | "sample";
  asOf: string;
  days: EtfFlowDay[];
  cumulativeUsd: number;
  totalNetAssetsUsd: number | null;
  issuers: EtfIssuerFlow[];
}
