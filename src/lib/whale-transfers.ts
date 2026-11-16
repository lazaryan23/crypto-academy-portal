import { cacheLife } from "next/cache";
import { getTopMarkets } from "@/lib/coingecko";
import { bitcoinExchange, ethereumExchange } from "@/lib/exchange-addresses";
import { classifyTransfer, type WhaleSnapshot, type WhaleTransfer } from "@/lib/whale-config";

export const MIN_WHALE_USD = 1_000_000;

const TIMEOUT_MS = 12_000;
const ETH_RPCS = ["https://ethereum-rpc.publicnode.com", "https://eth.drpc.org"];
const LOG_BLOCKS = 40;
const NATIVE_BLOCKS = 10;
const ETH_BLOCK_SECONDS = 12;
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const STABLECOINS: Record<string, { token: "USDT" | "USDC"; decimals: number }> = {
  "0xdac17f958d2ee523a2206206994597c13d831ec7": { token: "USDT", decimals: 6 },
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { token: "USDC", decimals: 6 },
};

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  let lastError: unknown;
  for (const url of ETH_RPCS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`${url} → ${res.status}`);
      const body = (await res.json()) as { result?: T; error?: { message?: string } };
      if (body.error || body.result === undefined) throw new Error(body.error?.message ?? "empty result");
      return body.result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function topicAddress(topic: string | undefined) {
  return topic ? `0x${topic.slice(-40)}`.toLowerCase() : "";
}

function party(address: string, exchange: string | null) {
  return { address, exchange };
}

type Log = { address: string; topics: string[]; data: string; transactionHash: string; logIndex: string; blockNumber: string };
type Block = { number: string; timestamp: string; transactions: { hash: string; from: string; to: string | null; value: string }[] };

async function ethereumTransfers(ethPrice: number | null): Promise<WhaleTransfer[]> {
  const latest = await rpc<Block>("eth_getBlockByNumber", ["latest", false]);
  const latestNumber = Number(BigInt(latest.number));
  const latestTime = Number(BigInt(latest.timestamp));
  const timeOf = (block: number) => (latestTime - (latestNumber - block) * ETH_BLOCK_SECONDS) * 1000;

  const [logs, blocks] = await Promise.all([
    rpc<Log[]>("eth_getLogs", [
      { fromBlock: `0x${(latestNumber - LOG_BLOCKS).toString(16)}`, toBlock: latest.number, address: Object.keys(STABLECOINS), topics: [TRANSFER_TOPIC] },
    ]).catch(() => [] as Log[]),
    ethPrice
      ? Promise.all(
          Array.from({ length: NATIVE_BLOCKS }, (_, i) => rpc<Block>("eth_getBlockByNumber", [`0x${(latestNumber - i).toString(16)}`, true]).catch(() => null)),
        )
      : Promise.resolve([] as (Block | null)[]),
  ]);

  const transfers: WhaleTransfer[] = [];
  for (const log of logs) {
    const meta = STABLECOINS[log.address.toLowerCase()];
    if (!meta || log.data.length < 3) continue;
    const amount = Number(BigInt(log.data)) / 10 ** meta.decimals;
    if (amount < MIN_WHALE_USD) continue;
    const from = topicAddress(log.topics[1]);
    const to = topicAddress(log.topics[2]);
    if (/^0x0{40}$/.test(from) || /^0x0{40}$/.test(to)) continue;
    const fromEx = ethereumExchange(from);
    const toEx = ethereumExchange(to);
    transfers.push({
      id: `${log.transactionHash}:${Number(BigInt(log.logIndex))}`,
      hash: log.transactionHash,
      chain: "ethereum",
      token: meta.token,
      amount,
      usd: amount,
      from: party(from, fromEx),
      to: party(to, toEx),
      type: classifyTransfer(fromEx, toEx),
      timestamp: timeOf(Number(BigInt(log.blockNumber))),
    });
  }

  if (ethPrice) {
    for (const block of blocks) {
      if (!block) continue;
      const time = Number(BigInt(block.timestamp)) * 1000;
      for (const tx of block.transactions) {
        if (!tx.to) continue;
        const amount = Number(BigInt(tx.value)) / 1e18;
        const usd = amount * ethPrice;
        if (usd < MIN_WHALE_USD) continue;
        const fromEx = ethereumExchange(tx.from);
        const toEx = ethereumExchange(tx.to);
        transfers.push({
          id: tx.hash,
          hash: tx.hash,
          chain: "ethereum",
          token: "ETH",
          amount,
          usd,
          from: party(tx.from.toLowerCase(), fromEx),
          to: party(tx.to.toLowerCase(), toEx),
          type: classifyTransfer(fromEx, toEx),
          timestamp: time,
        });
      }
    }
  }
  return transfers;
}

type BtcOutput = { value?: number; addr?: string };
type BtcTx = { hash: string; time: number; inputs: { prev_out?: BtcOutput }[]; out: BtcOutput[] };

async function cachedBitcoinBlockWhales(hash: string, btcPrice: number): Promise<WhaleTransfer[]> {
  "use cache";
  try {
    const res = await fetch(`https://blockchain.info/rawblock/${hash}`, { signal: AbortSignal.timeout(30_000), cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const block = (await res.json()) as { time: number; tx: BtcTx[] };
    const minBtc = MIN_WHALE_USD / btcPrice;
    const transfers: WhaleTransfer[] = [];
    for (const tx of block.tx) {
      const senders = tx.inputs.map((input) => input.prev_out?.addr).filter((addr): addr is string => Boolean(addr));
      if (!senders.length) continue;
      const main = tx.out.reduce<BtcOutput | null>((best, out) => ((out.value ?? 0) > (best?.value ?? 0) ? out : best), null);
      const amount = (main?.value ?? 0) / 1e8;
      if (!main?.addr || amount < minBtc || senders.includes(main.addr)) continue;
      const fromEx = senders.map(bitcoinExchange).find(Boolean) ?? null;
      const toEx = bitcoinExchange(main.addr);
      transfers.push({
        id: tx.hash,
        hash: tx.hash,
        chain: "bitcoin",
        token: "BTC",
        amount,
        usd: amount * btcPrice,
        from: party(senders[0], fromEx),
        to: party(main.addr, toEx),
        type: classifyTransfer(fromEx, toEx),
        timestamp: block.time * 1000,
      });
    }
    cacheLife({ stale: 3600, revalidate: 86400, expire: 86400 });
    return transfers;
  } catch {
    cacheLife({ stale: 0, revalidate: 30, expire: 120 });
    return [];
  }
}

async function bitcoinTransfers(btcPrice: number | null): Promise<WhaleTransfer[]> {
  if (!btcPrice) return [];
  const res = await fetch("https://blockchain.info/latestblock", { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  const { hash } = (await res.json()) as { hash: string };
  return cachedBitcoinBlockWhales(hash, Math.round(btcPrice));
}

async function cachedWhales(): Promise<WhaleSnapshot> {
  "use cache";
  const markets = await getTopMarkets().catch(() => []);
  const price = (id: string) => markets.find((coin) => coin.id === id)?.current_price ?? null;
  const [eth, btc] = await Promise.all([ethereumTransfers(price("ethereum")).catch(() => []), bitcoinTransfers(price("bitcoin")).catch(() => [])]);
  const transfers = [...eth, ...btc].sort((a, b) => b.timestamp - a.timestamp || b.usd - a.usd);
  cacheLife(transfers.length ? { stale: 30, revalidate: 45, expire: 600 } : { stale: 0, revalidate: 20, expire: 120 });
  return { transfers, minUsd: MIN_WHALE_USD, updatedAt: new Date().toISOString() };
}

export function getWhaleTransfers() {
  return cachedWhales();
}
