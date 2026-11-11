export type GuideWidget = "position-diagram" | "leverage-calculator" | "position-size-calculator" | "promo";

export type GuideBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "callout"; tone: "tip" | "warning" | "info"; title: string; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "widget"; widget: GuideWidget };

export interface GuideSection {
  id: string;
  heading: string;
  blocks: GuideBlock[];
}

export interface Guide {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  readMinutes: number;
  color: string;
  updated: string;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
}

export const guides: Guide[] = [
  {
    slug: "spot-vs-futures",
    title: "Spot vs. Futures Trading: What's the Difference?",
    shortTitle: "Spot vs. Futures",
    description:
      "Understand how buying coins outright differs from trading perpetual futures contracts — ownership, leverage, funding rates and risk.",
    level: "Beginner",
    readMinutes: 7,
    color: "blue",
    updated: "2026-11-01",
    sections: [
      {
        id: "what-is-spot",
        heading: "What is spot trading?",
        blocks: [
          {
            type: "paragraph",
            text: "Spot trading means buying or selling a cryptocurrency for immediate delivery at the current market price. When you buy 0.1 BTC on the spot market, you own 0.1 BTC. You can hold it, withdraw it to your own wallet, stake it or spend it.",
          },
          {
            type: "list",
            items: [
              "You can only lose what you put in — the price of an asset cannot go below zero.",
              "No liquidation: a 50% drawdown hurts, but your position stays open.",
              "Profit only when the price goes up (unless you sell and buy back lower).",
            ],
          },
        ],
      },
      {
        id: "what-are-futures",
        heading: "What are futures (perpetual contracts)?",
        blocks: [
          {
            type: "paragraph",
            text: "A futures contract is an agreement to buy or sell an asset at a set price. Crypto exchanges mostly offer perpetual futures (\"perps\") — contracts with no expiry date that track the spot price. You never own the coin; you hold a contract whose value moves with the price.",
          },
          {
            type: "paragraph",
            text: "To keep the perpetual price close to spot, exchanges use a funding rate: a small payment exchanged between longs and shorts every few hours. When the market is very bullish, longs usually pay shorts, and vice versa.",
          },
          {
            type: "callout",
            tone: "info",
            title: "Key idea",
            text: "Futures let you go long (profit if price rises) or short (profit if price falls), and use leverage — but you can be liquidated if the price moves against you far enough.",
          },
        ],
      },
      {
        id: "comparison",
        heading: "Side-by-side comparison",
        blocks: [
          {
            type: "table",
            headers: ["", "Spot", "Perpetual futures"],
            rows: [
              ["Ownership of the coin", "Yes", "No — you hold a contract"],
              ["Profit when price falls", "No", "Yes (short positions)"],
              ["Leverage", "None (1x)", "Typically 1x–125x"],
              ["Liquidation risk", "None", "Yes"],
              ["Ongoing costs", "Trading fees only", "Trading fees + funding rate"],
              ["Best suited for", "Long-term investing", "Short-term trading & hedging"],
            ],
          },
        ],
      },
      {
        id: "which-to-choose",
        heading: "Which one should you use?",
        blocks: [
          {
            type: "paragraph",
            text: "If you are building a long-term position in assets like Bitcoin or Ethereum, spot is simpler and safer. Futures are a tool for active traders who want to hedge, express a bearish view, or use capital more efficiently — and who have a written risk plan.",
          },
          {
            type: "callout",
            tone: "warning",
            title: "Start small",
            text: "Most new futures traders lose money in their first months. Practise on a demo account or with very small size and low leverage (2x–3x) before scaling up.",
          },
          { type: "widget", widget: "promo" },
        ],
      },
    ],
    faq: [
      {
        q: "Is futures trading riskier than spot?",
        a: "Yes. Leverage amplifies both gains and losses and introduces liquidation risk. A spot position can only fall to zero; a leveraged position can be closed by the exchange after a much smaller move.",
      },
      {
        q: "Do I pay funding on spot?",
        a: "No. Funding rates only apply to perpetual futures positions.",
      },
    ],
  },
  {
    slug: "long-and-short-positions",
    title: "How to Open Long and Short Positions (Step-by-Step with Diagrams)",
    shortTitle: "Long & Short Positions",
    description:
      "A visual walkthrough of going long and short on perpetual futures: order types, entries, take-profit and stop-loss placement.",
    level: "Beginner",
    readMinutes: 9,
    color: "teal",
    updated: "2026-11-01",
    sections: [
      {
        id: "long-vs-short",
        heading: "Long vs. short in one picture",
        blocks: [
          {
            type: "paragraph",
            text: "Going long means you profit if the price rises. Going short means you profit if the price falls. In both cases you define an entry, a take-profit (TP) where you lock in gains, and a stop-loss (SL) where you accept you were wrong.",
          },
          { type: "widget", widget: "position-diagram" },
        ],
      },
      {
        id: "step-by-step",
        heading: "Step-by-step: opening a position",
        blocks: [
          {
            type: "steps",
            items: [
              {
                title: "Transfer funds to your futures wallet",
                text: "Move USDT (or another margin asset) from your spot wallet to the USDⓈ-M futures wallet. Only transfer what you are prepared to risk.",
              },
              {
                title: "Choose the market and margin mode",
                text: "Select a pair such as BTCUSDT. Pick Isolated margin so that a losing trade can only use the margin assigned to it.",
              },
              {
                title: "Set your leverage",
                text: "Start at 2x–5x. Higher leverage does not change your risk if you size correctly, but it moves your liquidation price much closer to entry.",
              },
              {
                title: "Pick an order type",
                text: "Limit orders fill at your price or better and usually pay lower fees. Market orders fill immediately at the best available price.",
              },
              {
                title: "Click Buy/Long or Sell/Short",
                text: "Long if you expect the price to rise, short if you expect it to fall. Enter the size based on your risk, not your gut.",
              },
              {
                title: "Attach TP and SL immediately",
                text: "Set a stop-loss at the level that invalidates your idea, and a take-profit at a realistic target — ideally at least 2x the distance to your stop.",
              },
            ],
          },
        ],
      },
      {
        id: "examples",
        heading: "Worked examples",
        blocks: [
          {
            type: "table",
            headers: ["", "Long example", "Short example"],
            rows: [
              ["View", "BTC will bounce from support", "ETH will reject at resistance"],
              ["Entry", "$60,000", "$3,000"],
              ["Stop-loss", "$58,800 (−2%)", "$3,090 (+3%)"],
              ["Take-profit", "$63,000 (+5%)", "$2,820 (−6%)"],
              ["Risk : reward", "1 : 2.5", "1 : 2"],
            ],
          },
          {
            type: "callout",
            tone: "tip",
            title: "Reduce-only",
            text: "Mark TP and SL orders as reduce-only so they can only close your position and never accidentally open a new one in the opposite direction.",
          },
          { type: "widget", widget: "promo" },
        ],
      },
    ],
    faq: [
      {
        q: "Can I short on the spot market?",
        a: "Not directly. Shorting requires borrowing (margin trading) or a derivative such as a perpetual future.",
      },
      {
        q: "What happens if the price gaps past my stop-loss?",
        a: "Stop-market orders execute at the next available price, which may be worse than your stop level during fast markets (slippage).",
      },
    ],
  },
  {
    slug: "understanding-leverage",
    title: "Understanding Leverage (1x to 50x) & Margin Safety",
    shortTitle: "Leverage & Margin",
    description:
      "How leverage really works, how initial and maintenance margin determine your liquidation price, and why lower is usually better.",
    level: "Intermediate",
    readMinutes: 10,
    color: "orange",
    updated: "2026-11-01",
    sections: [
      {
        id: "how-leverage-works",
        heading: "How leverage works",
        blocks: [
          {
            type: "paragraph",
            text: "Leverage lets you control a position larger than your margin. With $100 of margin at 10x leverage you control a $1,000 position. A 1% price move changes your position value by $10 — that is 10% of your margin.",
          },
          {
            type: "table",
            headers: ["Leverage", "Position from $100", "P&L per 1% move", "Approx. move to liquidation"],
            rows: [
              ["1x", "$100", "±$1", "None in practice"],
              ["3x", "$300", "±$3", "≈ 33%"],
              ["5x", "$500", "±$5", "≈ 20%"],
              ["10x", "$1,000", "±$10", "≈ 10%"],
              ["25x", "$2,500", "±$25", "≈ 4%"],
              ["50x", "$5,000", "±$50", "≈ 2%"],
            ],
          },
        ],
      },
      {
        id: "margin",
        heading: "Initial margin, maintenance margin & liquidation",
        blocks: [
          {
            type: "list",
            items: [
              "Initial margin is the collateral you post to open the position (position size ÷ leverage).",
              "Maintenance margin is the minimum collateral needed to keep it open — often 0.4%–1% of position value for major pairs.",
              "Liquidation happens when your losses eat your margin down to the maintenance level. The exchange closes the position and you lose the margin.",
            ],
          },
          {
            type: "callout",
            tone: "warning",
            title: "Cross margin can take everything",
            text: "In cross margin mode the whole futures balance backs every position. One bad trade can drain your entire account. Prefer isolated margin while learning.",
          },
        ],
      },
      {
        id: "calculator",
        heading: "Interactive leverage & liquidation calculator",
        blocks: [
          {
            type: "paragraph",
            text: "Adjust leverage and see how quickly the liquidation price approaches your entry. The estimate uses isolated margin and ignores fees and funding, so real liquidation will be slightly closer.",
          },
          { type: "widget", widget: "leverage-calculator" },
          { type: "widget", widget: "promo" },
        ],
      },
    ],
    faq: [
      {
        q: "What leverage should a beginner use?",
        a: "Between 1x and 3x. Your risk should be controlled by position size and stop-loss, not by high leverage.",
      },
      {
        q: "Does higher leverage mean higher profit?",
        a: "Only if you keep the same margin — which also means proportionally larger losses and a liquidation price much closer to entry.",
      },
    ],
  },
  {
    slug: "risk-management",
    title: "Crucial Risk Management: How to Avoid Liquidation & Set Stop-Loss",
    shortTitle: "Risk Management",
    description:
      "The 1% rule, position sizing from your stop distance, stop-loss placement and a pre-trade checklist that keeps you in the game.",
    level: "Advanced",
    readMinutes: 11,
    color: "red",
    updated: "2026-11-01",
    sections: [
      {
        id: "one-percent-rule",
        heading: "The 1% rule",
        blocks: [
          {
            type: "paragraph",
            text: "Professional traders rarely risk more than 1–2% of their account on a single trade. With a $5,000 account and 1% risk, a trade that hits its stop-loss costs $50. Ten losses in a row still leaves you with about 90% of your capital.",
          },
          {
            type: "paragraph",
            text: "Position size is derived from that risk and your stop distance: position size = (account × risk %) ÷ stop distance %. Leverage only determines how much margin is locked up.",
          },
          { type: "widget", widget: "position-size-calculator" },
        ],
      },
      {
        id: "stop-loss",
        heading: "Where to place your stop-loss",
        blocks: [
          {
            type: "list",
            items: [
              "Below the most recent swing low for longs, above the swing high for shorts.",
              "Outside obvious round numbers where many stops cluster.",
              "Use ATR (average true range) to keep stops wider than normal noise.",
              "Always well before your liquidation price — a stop that never triggers before liquidation is not a stop.",
            ],
          },
        ],
      },
      {
        id: "avoid-liquidation",
        heading: "How to avoid liquidation",
        blocks: [
          {
            type: "steps",
            items: [
              { title: "Use low leverage", text: "At 3x a position needs a ~33% adverse move to liquidate; at 50x just ~2%." },
              { title: "Use isolated margin", text: "Contain the damage of one bad trade to that trade's margin." },
              { title: "Always set a stop-loss", text: "Your stop should trigger long before the liquidation price." },
              { title: "Never add margin to a loser", text: "Adding margin to avoid liquidation usually just increases the loss." },
              { title: "Watch funding & news", text: "Extreme funding and major macro events create violent wicks." },
            ],
          },
          {
            type: "callout",
            tone: "tip",
            title: "Pre-trade checklist",
            text: "Entry reason written down? Stop-loss set? Risk ≤ 1–2%? Reward at least 2x risk? Liquidation price far beyond the stop? If any answer is no, skip the trade.",
          },
          { type: "widget", widget: "promo" },
        ],
      },
    ],
    faq: [
      {
        q: "Is a mental stop-loss good enough?",
        a: "No. Markets can move faster than you can react, especially overnight. Place a real stop order on the exchange.",
      },
      {
        q: "Should I move my stop-loss?",
        a: "Only in the direction of your trade (e.g. to break-even after the price moves in your favour). Never widen it to avoid being stopped out.",
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}
