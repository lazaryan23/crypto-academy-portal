export const WHALE_TOKENS = ["BTC", "ETH", "USDT", "USDC"] as const;
export type WhaleToken = (typeof WHALE_TOKENS)[number];

export type TransferType = "inflow" | "outflow" | "exchange" | "wallet";

export interface WhaleParty {
  address: string;
  exchange: string | null;
}

export interface WhaleTransfer {
  id: string;
  hash: string;
  chain: "bitcoin" | "ethereum";
  token: WhaleToken;
  amount: number;
  usd: number;
  from: WhaleParty;
  to: WhaleParty;
  type: TransferType;
  timestamp: number;
}

export interface WhaleSnapshot {
  transfers: WhaleTransfer[];
  minUsd: number;
  updatedAt: string;
}

export const TRANSFER_TYPE_LABELS: Record<TransferType, string> = {
  inflow: "Exchange inflow",
  outflow: "Exchange outflow",
  exchange: "Exchange to exchange",
  wallet: "Wallet to wallet",
};

export function classifyTransfer(fromExchange: string | null, toExchange: string | null): TransferType {
  if (fromExchange && toExchange) return "exchange";
  if (toExchange) return "inflow";
  if (fromExchange) return "outflow";
  return "wallet";
}

export function explorerUrl(transfer: Pick<WhaleTransfer, "chain" | "hash">) {
  return transfer.chain === "bitcoin" ? `https://mempool.space/tx/${transfer.hash}` : `https://etherscan.io/tx/${transfer.hash}`;
}
