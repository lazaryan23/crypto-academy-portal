import { getFearGreedHistory, type FearGreedHistory } from "@/lib/fear-greed";
import { getGlobalMarket, getTopMarkets } from "@/lib/coingecko";

export interface MarketSentiment {
  fearGreed: FearGreedHistory | null;
  totalMarketCapUsd: number | null;
  marketCapChange24h: number | null;
  totalVolumeUsd: number | null;
  btcDominance: number | null;
  btcDominanceChange24h: number | null;
  ethDominance: number | null;
  ethDominanceChange24h: number | null;
}

export function dominanceChange(dominanceNow: number | null, coinCapChange24h: number | null, totalCapChange24h: number | null) {
  if (dominanceNow == null || coinCapChange24h == null || totalCapChange24h == null) return null;
  const dominanceBefore = (dominanceNow * (1 + totalCapChange24h / 100)) / (1 + coinCapChange24h / 100);
  return Number.isFinite(dominanceBefore) ? dominanceNow - dominanceBefore : null;
}

export async function getMarketSentiment(): Promise<MarketSentiment> {
  const [fearGreed, global, markets] = await Promise.all([getFearGreedHistory(), getGlobalMarket(), getTopMarkets(10)]);
  const capChange = (id: string) => markets.find((coin) => coin.id === id)?.market_cap_change_percentage_24h ?? null;
  const totalChange = global?.marketCapChange24h ?? null;
  return {
    fearGreed,
    totalMarketCapUsd: global?.totalMarketCapUsd ?? null,
    marketCapChange24h: totalChange,
    totalVolumeUsd: global?.totalVolumeUsd ?? null,
    btcDominance: global?.btcDominance ?? null,
    btcDominanceChange24h: dominanceChange(global?.btcDominance ?? null, capChange("bitcoin"), totalChange),
    ethDominance: global?.ethDominance ?? null,
    ethDominanceChange24h: dominanceChange(global?.ethDominance ?? null, capChange("ethereum"), totalChange),
  };
}
