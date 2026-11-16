import { cacheLife } from "next/cache";
import type { ChainFee, ChainFeesSnapshot, ChainId, FeeTiers } from "@/lib/chain-fees-config";
import { getTopMarkets } from "@/lib/coingecko";
import { getBitcoinFees } from "@/lib/network-fees";

const TIMEOUT_MS = 6000;
const WEI_PER_GWEI = 1e9;
const BTC_TX_VBYTES = 140;
const EVM_TRANSFER_GAS = 21_000;
const SOL_BASE_FEE_LAMPORTS = 5000;
const SOL_COMPUTE_UNITS = 200_000;
const LAMPORTS_PER_SOL = 1e9;

const EVM_CHAINS: { id: Extract<ChainId, "ethereum" | "arbitrum" | "optimism" | "base">; name: string; rpcs: string[]; note: string | null }[] = [
  { id: "ethereum", name: "Ethereum", rpcs: ["https://ethereum-rpc.publicnode.com", "https://eth.drpc.org", "https://1rpc.io/eth"], note: null },
  {
    id: "arbitrum",
    name: "Arbitrum",
    rpcs: ["https://arbitrum-one-rpc.publicnode.com", "https://arb1.arbitrum.io/rpc"],
    note: "L2 execution fee; a small L1 data fee is added on top.",
  },
  {
    id: "optimism",
    name: "Optimism",
    rpcs: ["https://optimism-rpc.publicnode.com", "https://mainnet.optimism.io"],
    note: "L2 execution fee; a small L1 data fee is added on top.",
  },
  {
    id: "base",
    name: "Base",
    rpcs: ["https://base-rpc.publicnode.com", "https://mainnet.base.org"],
    note: "L2 execution fee; a small L1 data fee is added on top.",
  },
];

const SOLANA_RPCS = ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"];

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message?: string } };
  if (body.error || body.result === undefined) throw new Error(body.error?.message ?? "empty result");
  return body.result;
}

async function firstOk<T>(urls: string[], run: (url: string) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const url of urls) {
    try {
      return await run(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[index];
}

function median(values: number[]) {
  return percentile(values, 50);
}

function scale(tiers: FeeTiers, factor: number): FeeTiers {
  return { low: tiers.low * factor, standard: tiers.standard * factor, fast: tiers.fast * factor };
}

type FeeHistory = { baseFeePerGas: string[]; reward?: string[][] };

async function evmTiers(rpcs: string[]): Promise<FeeTiers> {
  return firstOk(rpcs, async (url) => {
    const history = await rpc<FeeHistory>(url, "eth_feeHistory", ["0x14", "latest", [10, 50, 90]]);
    const gwei = (hex: string) => Number(BigInt(hex)) / WEI_PER_GWEI;
    const baseFee = gwei(history.baseFeePerGas[history.baseFeePerGas.length - 1]);
    if (!Number.isFinite(baseFee)) throw new Error("bad base fee");
    const rewards = (history.reward ?? []).filter((row) => row.length === 3);
    const tip = (i: number) => median(rewards.map((row) => gwei(row[i])));
    return { low: baseFee + tip(0), standard: baseFee + tip(1), fast: baseFee + Math.max(tip(2), tip(1)) };
  });
}

async function solanaTiers(): Promise<FeeTiers> {
  return firstOk(SOLANA_RPCS, async (url) => {
    const rows = await rpc<{ prioritizationFee: number }[]>(url, "getRecentPrioritizationFees", [["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"]]);
    const fees = rows.map((row) => row.prioritizationFee).filter((fee) => Number.isFinite(fee));
    if (!fees.length) throw new Error("no fees");
    const lamports = (microLamportsPerCu: number) => SOL_BASE_FEE_LAMPORTS + (microLamportsPerCu * SOL_COMPUTE_UNITS) / 1e6;
    return { low: lamports(percentile(fees, 25)), standard: lamports(percentile(fees, 50)), fast: lamports(percentile(fees, 75)) };
  });
}

async function cachedChainFees(): Promise<ChainFeesSnapshot> {
  "use cache";
  const [btc, markets, evm, solana] = await Promise.all([
    getBitcoinFees(),
    getTopMarkets().catch(() => []),
    Promise.all(EVM_CHAINS.map((chain) => evmTiers(chain.rpcs).catch(() => null))),
    solanaTiers().catch(() => null),
  ]);
  const price = (id: string) => markets.find((coin) => coin.id === id)?.current_price ?? null;
  const btcPrice = price("bitcoin");
  const ethPrice = price("ethereum");
  const solPrice = price("solana");

  const chains: ChainFee[] = [];
  if (btc) {
    const tiers = { low: btc.hour, standard: btc.halfHour, fast: btc.fastest };
    chains.push({
      id: "bitcoin",
      name: "Bitcoin",
      unit: "sat/vB",
      tiers,
      transferUsd: btcPrice ? scale(tiers, (BTC_TX_VBYTES / 1e8) * btcPrice) : null,
      transferLabel: "Typical transfer",
      note: null,
    });
  }
  EVM_CHAINS.forEach((chain, i) => {
    const tiers = evm[i];
    if (!tiers) return;
    chains.push({
      id: chain.id,
      name: chain.name,
      unit: "Gwei",
      tiers,
      transferUsd: ethPrice ? scale(tiers, (EVM_TRANSFER_GAS / WEI_PER_GWEI) * ethPrice) : null,
      transferLabel: "ETH transfer",
      note: chain.note,
    });
  });
  if (solana) {
    chains.push({
      id: "solana",
      name: "Solana",
      unit: "lamports",
      tiers: solana,
      transferUsd: solPrice ? scale(solana, solPrice / LAMPORTS_PER_SOL) : null,
      transferLabel: "Transaction",
      note: "5,000 lamport base fee plus priority fee at the default compute limit.",
    });
  }

  cacheLife(chains.length >= 4 ? { stale: 20, revalidate: 30, expire: 300 } : { stale: 0, revalidate: 15, expire: 120 });
  return { chains, updatedAt: new Date().toISOString() };
}

export function getChainFees() {
  return cachedChainFees();
}
