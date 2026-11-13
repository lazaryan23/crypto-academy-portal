import { getTopMarkets } from "@/lib/coingecko";
import { getBitcoinFees, getEthereumGas, type BitcoinFees, type EthereumGas } from "@/lib/network-fees";

export interface NetworkSnapshot {
  bitcoin: BitcoinFees | null;
  ethereum: EthereumGas | null;
  btcPrice: number | null;
  ethPrice: number | null;
}

export async function getNetworkSnapshot(): Promise<NetworkSnapshot> {
  const [bitcoin, ethereum, markets] = await Promise.all([getBitcoinFees(), getEthereumGas(), getTopMarkets().catch(() => [])]);
  const priceOf = (id: string) => markets.find((coin) => coin.id === id)?.current_price ?? null;
  return { bitcoin, ethereum, btcPrice: priceOf("bitcoin"), ethPrice: priceOf("ethereum") };
}
