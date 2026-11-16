export interface MetricEntry {
  title: string;
  text: string;
  href: string;
  linkLabel: string;
}

export const metricGlossary = {
  openInterest: {
    title: "Open interest",
    text: "The total value of futures contracts still open, so every position has a long and a short behind it. Rising open interest means new leveraged money is entering; a sharp drop means positions are being closed or liquidated.",
    href: "/academy/spot-vs-futures#what-are-futures",
    linkLabel: "How futures work",
  },
  fundingRate: {
    title: "Funding rate",
    text: "A periodic payment between longs and shorts that keeps perpetual futures close to the spot price. Traders read very high positive funding as overcrowded longs and negative funding as crowded shorts, both of which often precede squeezes.",
    href: "/academy/spot-vs-futures#what-are-futures",
    linkLabel: "Funding explained",
  },
  longShortRatio: {
    title: "Long/short ratio",
    text: "The share of trader accounts holding a net long versus a net short position. Contrarian traders watch for very one-sided readings, because the crowd is often on the wrong side right before a sharp reversal.",
    href: "/academy/long-and-short-positions#long-vs-short",
    linkLabel: "Longs vs shorts",
  },
  liquidationClusters: {
    title: "Liquidation clusters",
    text: "Price zones where many leveraged positions would be force-closed by the exchange. Price often gets pulled toward large clusters, and hitting one can trigger a cascade of forced selling or buying.",
    href: "/academy/risk-management#avoid-liquidation",
    linkLabel: "How to avoid liquidation",
  },
  maxPain: {
    title: "Max pain",
    text: "The expiry price at which option buyers would lose the most and option sellers keep the most premium. Some traders expect price to drift toward it into a large expiry, but it is a tendency, not a target.",
    href: "/options#options-explained",
    linkLabel: "Options metrics explained",
  },
  oiSignals: {
    title: "Price vs open interest",
    text: "Comparing price change with open interest change shows who is driving a move: new positions or closing ones. Rising price with rising open interest is fresh longs; rising price with falling open interest is usually shorts covering.",
    href: "/academy/long-and-short-positions#long-vs-short",
    linkLabel: "Longs vs shorts",
  },
} satisfies Record<string, MetricEntry>;

export type MetricKey = keyof typeof metricGlossary;
