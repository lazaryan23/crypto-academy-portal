export type ExchangeId = "binance" | "bybit" | "okx" | "bingx";

export interface ExchangeAffiliate {
  id: ExchangeId;
  name: string;
  referralUrl: string;
  promoCode: string;
  headline: string;
  perks: string[];
  color: string;
  supportsFutures: boolean;
}

export const exchanges: Record<ExchangeId, ExchangeAffiliate> = {
  binance: {
    id: "binance",
    name: "Binance",
    referralUrl: "https://accounts.binance.com/register?ref=YOUR_BINANCE_CODE",
    promoCode: "YOUR_BINANCE_CODE",
    headline: "Up to 20% off trading fees",
    perks: ["Largest spot liquidity", "USDⓈ-M & COIN-M futures", "Fee discount with our code"],
    color: "yellow",
    supportsFutures: true,
  },
  bybit: {
    id: "bybit",
    name: "Bybit",
    referralUrl: "https://www.bybit.com/invite?ref=YOUR_BYBIT_CODE",
    promoCode: "YOUR_BYBIT_CODE",
    headline: "Up to $100 deposit bonus",
    perks: ["Derivatives-first platform", "Demo trading account", "New-user deposit rewards"],
    color: "orange",
    supportsFutures: true,
  },
  okx: {
    id: "okx",
    name: "OKX",
    referralUrl: "https://www.okx.com/join/YOUR_OKX_CODE",
    promoCode: "YOUR_OKX_CODE",
    headline: "Fee discount for new users",
    perks: ["Spot, futures & options", "Built-in Web3 wallet", "Copy trading"],
    color: "gray",
    supportsFutures: true,
  },
  bingx: {
    id: "bingx",
    name: "BingX",
    referralUrl: "https://bingx.com/invite/YOUR_BINGX_CODE",
    promoCode: "YOUR_BINGX_CODE",
    headline: "Welcome rewards for new traders",
    perks: ["Copy trading marketplace", "Perpetual futures", "Low minimum deposit"],
    color: "blue",
    supportsFutures: true,
  },
};

export const exchangeList: ExchangeAffiliate[] = Object.values(exchanges);

export const featuredPromo = {
  title: "Trade with a discount",
  description:
    "Sign up on Bybit or Binance with our code for up to 20% off trading fees plus up to a $100 deposit bonus.",
  exchangeIds: ["bybit", "binance"] as ExchangeId[],
};

export const affiliateDisclosure =
  "Some links are affiliate links. We may earn a commission at no extra cost to you. Bonus terms are set by each exchange and can change.";

export function getExchanges(ids: ExchangeId[]): ExchangeAffiliate[] {
  return ids.map((id) => exchanges[id]);
}
