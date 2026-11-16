export const CHAIN_IDS = ["bitcoin", "ethereum", "arbitrum", "optimism", "base", "solana"] as const;
export type ChainId = (typeof CHAIN_IDS)[number];

export interface FeeTiers {
  low: number;
  standard: number;
  fast: number;
}

export interface ChainFee {
  id: ChainId;
  name: string;
  unit: "sat/vB" | "Gwei" | "lamports";
  tiers: FeeTiers;
  transferUsd: FeeTiers | null;
  transferLabel: string;
  note: string | null;
}

export interface ChainFeesSnapshot {
  chains: ChainFee[];
  updatedAt: string;
}
