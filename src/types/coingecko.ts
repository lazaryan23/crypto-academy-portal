export type Nullable<T> = T | null;

export interface CoinMarketRoi {
  times: number;
  currency: string;
  percentage: number;
}

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: Nullable<number>;
  market_cap: Nullable<number>;
  market_cap_rank: Nullable<number>;
  fully_diluted_valuation: Nullable<number>;
  total_volume: Nullable<number>;
  high_24h: Nullable<number>;
  low_24h: Nullable<number>;
  price_change_24h: Nullable<number>;
  price_change_percentage_24h: Nullable<number>;
  market_cap_change_24h: Nullable<number>;
  market_cap_change_percentage_24h: Nullable<number>;
  circulating_supply: Nullable<number>;
  total_supply: Nullable<number>;
  max_supply: Nullable<number>;
  ath: Nullable<number>;
  ath_change_percentage: Nullable<number>;
  ath_date: Nullable<string>;
  atl: Nullable<number>;
  atl_change_percentage: Nullable<number>;
  atl_date: Nullable<string>;
  roi: Nullable<CoinMarketRoi>;
  last_updated: Nullable<string>;
  sparkline_in_7d?: { price: number[] };
  price_change_percentage_1h_in_currency?: Nullable<number>;
  price_change_percentage_24h_in_currency?: Nullable<number>;
  price_change_percentage_7d_in_currency?: Nullable<number>;
}

export type CurrencyMap = Record<string, number | undefined>;
export type CurrencyDateMap = Record<string, string | undefined>;

export interface CoinImage {
  thumb: string;
  small: string;
  large: string;
}

export interface CoinLinks {
  homepage: string[];
  whitepaper?: string;
  blockchain_site: string[];
  official_forum_url: string[];
  twitter_screen_name: Nullable<string>;
  subreddit_url: Nullable<string>;
  repos_url: { github: string[]; bitbucket: string[] };
}

export interface CoinMarketData {
  current_price: CurrencyMap;
  ath: CurrencyMap;
  ath_change_percentage: CurrencyMap;
  ath_date: CurrencyDateMap;
  atl: CurrencyMap;
  atl_change_percentage: CurrencyMap;
  atl_date: CurrencyDateMap;
  market_cap: CurrencyMap;
  market_cap_rank: Nullable<number>;
  fully_diluted_valuation: CurrencyMap;
  total_volume: CurrencyMap;
  high_24h: CurrencyMap;
  low_24h: CurrencyMap;
  price_change_24h: Nullable<number>;
  price_change_percentage_24h: Nullable<number>;
  price_change_percentage_7d: Nullable<number>;
  price_change_percentage_30d: Nullable<number>;
  price_change_percentage_1y: Nullable<number>;
  market_cap_change_percentage_24h: Nullable<number>;
  circulating_supply: Nullable<number>;
  total_supply: Nullable<number>;
  max_supply: Nullable<number>;
  last_updated: Nullable<string>;
}

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  web_slug?: string;
  hashing_algorithm: Nullable<string>;
  categories: string[];
  description: { en: string };
  links: CoinLinks;
  image: CoinImage;
  genesis_date: Nullable<string>;
  market_cap_rank: Nullable<number>;
  market_data: CoinMarketData;
  last_updated: string;
}

export type ChartPoint = [timestamp: number, value: number];

export interface MarketChart {
  prices: ChartPoint[];
  market_caps: ChartPoint[];
  total_volumes: ChartPoint[];
}

export interface TrendingCoinItem {
  id: string;
  coin_id: number;
  name: string;
  symbol: string;
  market_cap_rank: Nullable<number>;
  thumb: string;
  small: string;
  large: string;
  slug: string;
  score: number;
}

export interface TrendingResponse {
  coins: { item: TrendingCoinItem }[];
}

export interface SearchCoin {
  id: string;
  name: string;
  api_symbol: string;
  symbol: string;
  market_cap_rank: Nullable<number>;
  thumb: string;
  large: string;
}

export interface SearchResponse {
  coins: SearchCoin[];
}

export type MarketCategory = "top" | "trending" | "layer-1" | "defi" | "meme";

export type ChartRange = "1" | "7" | "30" | "90" | "365";
