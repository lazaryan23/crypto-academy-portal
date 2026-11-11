export interface AllocationBucket {
  label: string;
  percent: number;
  color: string;
  examples: string;
}

export interface AllocationProfile {
  value: string;
  label: string;
  description: string;
  buckets: AllocationBucket[];
}

export const allocationProfiles: AllocationProfile[] = [
  {
    value: "balanced",
    label: "Balanced 60/30/10",
    description: "The classic framework: a large core in the two most established assets, a satellite of top altcoins and a small speculative sleeve.",
    buckets: [
      { label: "Core: BTC & ETH", percent: 60, color: "brand", examples: "Bitcoin, Ethereum" },
      { label: "Top altcoins", percent: 30, color: "blue", examples: "Solana, BNB, TON, XRP" },
      { label: "High risk", percent: 10, color: "orange", examples: "Small caps, new narratives, meme coins" },
    ],
  },
  {
    value: "conservative",
    label: "Conservative 80/15/5",
    description: "For first-time investors or anyone with a low tolerance for drawdowns. Most of the portfolio sits in Bitcoin and Ethereum.",
    buckets: [
      { label: "Core: BTC & ETH", percent: 80, color: "brand", examples: "Bitcoin, Ethereum" },
      { label: "Top altcoins", percent: 15, color: "blue", examples: "Solana, BNB" },
      { label: "High risk", percent: 5, color: "orange", examples: "One or two small positions" },
    ],
  },
  {
    value: "aggressive",
    label: "Aggressive 40/40/20",
    description: "Higher potential upside and much deeper drawdowns. Only suitable for experienced investors with a long time horizon.",
    buckets: [
      { label: "Core: BTC & ETH", percent: 40, color: "brand", examples: "Bitcoin, Ethereum" },
      { label: "Top altcoins", percent: 40, color: "blue", examples: "Layer 1s, DeFi blue chips" },
      { label: "High risk", percent: 20, color: "orange", examples: "Early-stage tokens, memes" },
    ],
  },
];

export interface LongTermPick {
  id: string;
  tier: "Core" | "Large-cap altcoin";
  thesis: string;
  risks: string;
}

export const longTermPicks: LongTermPick[] = [
  {
    id: "bitcoin",
    tier: "Core",
    thesis: "Fixed 21M supply, the deepest liquidity, spot ETFs and growing institutional adoption make Bitcoin the benchmark crypto asset.",
    risks: "Regulatory shifts, energy debates, and 50–80% historical drawdowns in bear markets.",
  },
  {
    id: "ethereum",
    tier: "Core",
    thesis: "The leading smart-contract platform and settlement layer for DeFi, stablecoins and tokenization, with staking yield.",
    risks: "Competition from faster Layer 1s, value leakage to Layer 2s, technical upgrade risk.",
  },
  {
    id: "solana",
    tier: "Large-cap altcoin",
    thesis: "High-performance chain with strong developer and user growth in trading, payments and consumer apps.",
    risks: "Past network outages, validator concentration, high volatility.",
  },
  {
    id: "binancecoin",
    tier: "Large-cap altcoin",
    thesis: "Utility across the largest exchange ecosystem and BNB Chain, with regular token burns.",
    risks: "Concentrated exposure to a single company and its regulatory situation.",
  },
  {
    id: "the-open-network",
    tier: "Large-cap altcoin",
    thesis: "Distribution through Telegram's very large user base for payments, wallets and mini-apps.",
    risks: "Dependency on Telegram, token concentration, early-stage ecosystem.",
  },
];

export const investingPrinciples = [
  { title: "Dollar-cost average", text: "Invest a fixed amount on a schedule (e.g. weekly) instead of trying to time the bottom." },
  { title: "Rebalance periodically", text: "Every quarter, trim what has outgrown its target weight and top up what has lagged." },
  { title: "Only invest what you can hold through a 70% drawdown", text: "Crypto bear markets are brutal. Size so that you never become a forced seller." },
  { title: "Self-custody your long-term holdings", text: "Move coins you plan to hold for years to a hardware wallet you control." },
  { title: "Keep leverage out of your long-term portfolio", text: "Futures belong in a separate, small trading account — never mixed with your investments." },
];
