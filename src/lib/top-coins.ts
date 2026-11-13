import type { CoinMarket } from "@/types/coingecko";

let topCoinsRequest: Promise<CoinMarket[]> | null = null;

export function loadTopCoins(): Promise<CoinMarket[]> {
  topCoinsRequest ??= fetch("/api/markets?category=top")
    .then((res) => (res.ok ? (res.json() as Promise<CoinMarket[]>) : Promise.reject(new Error(String(res.status)))))
    .catch((err) => {
      topCoinsRequest = null;
      throw err;
    });
  return topCoinsRequest;
}
