const productionUrl = "https://www.coincompass.org";

function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/^["']|["']$/g, "");
  const fallback = process.env.NODE_ENV === "production" ? productionUrl : "http://localhost:3000";
  if (!raw) return fallback;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return fallback;
  }
}

export const siteConfig = {
  name: "CoinCompass",
  tagline: "Live crypto markets & trading academy",
  description:
    "Live cryptocurrency prices, interactive charts, and in-depth guides on spot and futures trading, leverage, risk management, and long-term crypto investing.",
  url: resolveSiteUrl(),
  nav: [
    { label: "Markets", href: "/" },
    { label: "Academy", href: "/academy" },
    { label: "Investing Guide", href: "/investing-guide" },
    { label: "Heatmap", href: "/heatmap" },
    { label: "Derivatives", href: "/derivatives" },
    { label: "News", href: "/news" },
  ],
  tools: [
    { label: "Compare coins", href: "/compare" },
    { label: "DCA calculator", href: "/tools/dca" },
    { label: "Profit calculator", href: "/tools/calculator" },
    { label: "Gas & converter", href: "/tools/gas-converter" },
  ],
};

export const defaultOgImages = [
  { url: "/opengraph-image", width: 1200, height: 630, alt: `${siteConfig.name} — ${siteConfig.tagline}` },
];

export const riskDisclaimer =
  "Educational content only, not financial advice. Crypto assets are highly volatile and leveraged trading can lose more than your initial margin. Do your own research.";
