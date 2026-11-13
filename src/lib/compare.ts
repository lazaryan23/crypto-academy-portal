import { popularCoinIds } from "@/content/coin-profiles";
import { getMarkets } from "@/lib/coingecko";
import type { CoinMarket } from "@/types/coingecko";

export async function getPairMarkets(a: string, b: string): Promise<[CoinMarket, CoinMarket] | null> {
  const bothPopular = popularCoinIds.includes(a) && popularCoinIds.includes(b);
  const coins = bothPopular
    ? await getMarkets({ ids: popularCoinIds, perPage: popularCoinIds.length })
    : await getMarkets({ ids: [a, b].sort(), perPage: 2 });
  const first = coins.find((coin) => coin.id === a);
  const second = coins.find((coin) => coin.id === b);
  return first && second ? [first, second] : null;
}
