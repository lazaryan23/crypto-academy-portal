export interface CoinProfile {
  summary: string;
  creators: string;
  launched: string;
  consensus: string;
  useCases: string[];
  tradingSymbol?: string;
}

export const coinProfiles: Record<string, CoinProfile> = {
  bitcoin: {
    summary:
      "Bitcoin is the first decentralized cryptocurrency: a peer-to-peer electronic cash system with a fixed supply of 21 million coins, secured by proof-of-work mining.",
    creators: "Satoshi Nakamoto (pseudonymous), whitepaper published October 2008",
    launched: "January 2009",
    consensus: "Proof of Work (SHA-256)",
    useCases: ["Store of value / \"digital gold\"", "Censorship-resistant payments", "Lightning Network micropayments", "Treasury reserve asset"],
    tradingSymbol: "BTC",
  },
  ethereum: {
    summary:
      "Ethereum is a programmable blockchain that runs smart contracts. It is the base layer for most of DeFi, NFTs, stablecoins and a large ecosystem of Layer 2 rollups.",
    creators: "Vitalik Buterin, with co-founders including Gavin Wood and Joseph Lubin",
    launched: "July 2015",
    consensus: "Proof of Stake (since The Merge, September 2022)",
    useCases: ["Smart contracts & dApps", "DeFi lending and exchanges", "Stablecoin settlement", "Settlement layer for rollups"],
    tradingSymbol: "ETH",
  },
  solana: {
    summary:
      "Solana is a high-throughput Layer 1 blockchain designed for low fees and fast finality, popular for trading, payments, consumer apps and meme coins.",
    creators: "Anatoly Yakovenko and Raj Gokal (Solana Labs)",
    launched: "March 2020",
    consensus: "Proof of Stake with Proof of History",
    useCases: ["High-frequency on-chain trading", "Payments", "NFTs and consumer apps", "DePIN networks"],
    tradingSymbol: "SOL",
  },
  "the-open-network": {
    summary:
      "TON (The Open Network) is a Layer 1 blockchain originally designed by Telegram and now developed by an independent community, deeply integrated with Telegram's user base.",
    creators: "Nikolai and Pavel Durov (original design); TON Foundation and community",
    launched: "2021 (mainnet under community stewardship)",
    consensus: "Proof of Stake",
    useCases: ["Payments inside Telegram", "Telegram mini-apps & games", "Wallets and usernames", "Low-cost transfers"],
    tradingSymbol: "TON",
  },
  binancecoin: {
    summary:
      "BNB is the native asset of BNB Chain and the Binance ecosystem, used for gas fees, trading fee discounts and participation in token launches.",
    creators: "Binance, founded by Changpeng Zhao",
    launched: "July 2017",
    consensus: "Proof of Staked Authority (BNB Smart Chain)",
    useCases: ["Gas on BNB Chain", "Exchange fee discounts", "Launchpool participation", "DeFi collateral"],
    tradingSymbol: "BNB",
  },
  ripple: {
    summary:
      "XRP is the native asset of the XRP Ledger, designed for fast, low-cost cross-border payments and liquidity between currencies.",
    creators: "Jed McCaleb, Arthur Britto and David Schwartz; later Ripple Labs",
    launched: "June 2012",
    consensus: "XRP Ledger Consensus Protocol",
    useCases: ["Cross-border remittances", "Bridge currency for liquidity", "Tokenized assets on XRPL"],
    tradingSymbol: "XRP",
  },
  cardano: {
    summary:
      "Cardano is a research-driven proof-of-stake blockchain built with peer-reviewed protocols and the Haskell-based Plutus smart contract platform.",
    creators: "Charles Hoskinson (IOHK / Input Output)",
    launched: "September 2017",
    consensus: "Ouroboros Proof of Stake",
    useCases: ["Smart contracts", "Staking", "Identity and supply-chain projects"],
    tradingSymbol: "ADA",
  },
  dogecoin: {
    summary:
      "Dogecoin started as a lighthearted fork of Litecoin and became one of the most widely held cryptocurrencies, used for tipping and payments.",
    creators: "Billy Markus and Jackson Palmer",
    launched: "December 2013",
    consensus: "Proof of Work (Scrypt, merge-mined with Litecoin)",
    useCases: ["Tipping and micropayments", "Community-driven payments", "Speculative trading"],
    tradingSymbol: "DOGE",
  },
};

export const popularCoinIds = Object.keys(coinProfiles);
