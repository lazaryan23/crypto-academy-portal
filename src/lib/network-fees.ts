import { cacheLife } from "next/cache";

export interface BitcoinFees {
  fastest: number;
  halfHour: number;
  hour: number;
  economy: number;
}

export interface EthereumGas {
  baseFee: number | null;
  low: number | null;
  standard: number;
  fast: number | null;
  source: string;
}

export interface FiatRates {
  rates: Record<string, number>;
  updatedAt: string | null;
}

const ETH_RPCS = [
  { name: "PublicNode", url: "https://ethereum-rpc.publicnode.com" },
  { name: "dRPC", url: "https://eth.drpc.org" },
  { name: "1RPC", url: "https://1rpc.io/eth" },
];

const TIMEOUT_MS = 6000;
const WEI_PER_GWEI = 1e9;

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

async function cachedBitcoinFees(): Promise<BitcoinFees | null> {
  "use cache";
  try {
    const res = await fetch("https://mempool.space/api/v1/fees/recommended", { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as Record<string, unknown>;
    const fees = { fastest: body.fastestFee, halfHour: body.halfHourFee, hour: body.hourFee, economy: body.economyFee };
    if (!Object.values(fees).every(finitePositive)) throw new Error("bad payload");
    cacheLife({ stale: 60, revalidate: 60, expire: 600 });
    return fees as BitcoinFees;
  } catch {
    cacheLife({ stale: 0, revalidate: 20, expire: 60 });
    return null;
  }
}

export function getBitcoinFees() {
  return cachedBitcoinFees();
}

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

function hexToGwei(hex: string) {
  return Number(BigInt(hex)) / WEI_PER_GWEI;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

type FeeHistory = { baseFeePerGas: string[]; reward?: string[][] };

async function gasFromFeeHistory(url: string, name: string): Promise<EthereumGas> {
  const history = await rpc<FeeHistory>(url, "eth_feeHistory", ["0x14", "latest", [10, 50, 90]]);
  const baseFee = hexToGwei(history.baseFeePerGas[history.baseFeePerGas.length - 1]);
  const rewards = (history.reward ?? []).filter((row) => row.length === 3);
  const tip = (i: number) => median(rewards.map((row) => hexToGwei(row[i])));
  const [low, standard, fast] = [tip(0), tip(1), tip(2)];
  if (standard === null || !Number.isFinite(baseFee)) throw new Error("no fee history");
  return { baseFee, low: baseFee + (low ?? 0), standard: baseFee + standard, fast: baseFee + (fast ?? standard), source: name };
}

async function gasFromGasPrice(url: string, name: string): Promise<EthereumGas> {
  const price = hexToGwei(await rpc<string>(url, "eth_gasPrice", []));
  return { baseFee: null, low: null, standard: price, fast: null, source: name };
}

async function cachedEthereumGas(): Promise<EthereumGas | null> {
  "use cache";
  for (const strategy of [gasFromFeeHistory, gasFromGasPrice]) {
    for (const endpoint of ETH_RPCS) {
      try {
        const gas = await strategy(endpoint.url, endpoint.name);
        cacheLife({ stale: 30, revalidate: 30, expire: 300 });
        return gas;
      } catch {
        continue;
      }
    }
  }
  cacheLife({ stale: 0, revalidate: 20, expire: 60 });
  return null;
}

export function getEthereumGas() {
  return cachedEthereumGas();
}

async function cachedFiatRates(): Promise<FiatRates | null> {
  "use cache";
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number };
    if (body.result !== "success" || !body.rates?.USD) throw new Error("bad payload");
    const rates = Object.fromEntries(Object.entries(body.rates).filter(([, rate]) => finitePositive(rate) && rate > 0));
    cacheLife({ stale: 3600, revalidate: 3600, expire: 86400 });
    return { rates, updatedAt: body.time_last_update_unix ? new Date(body.time_last_update_unix * 1000).toISOString() : null };
  } catch {
    cacheLife({ stale: 0, revalidate: 120, expire: 600 });
    return null;
  }
}

export function getFiatRates() {
  return cachedFiatRates();
}
