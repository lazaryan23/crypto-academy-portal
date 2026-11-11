export const siteConfig = {
  name: "CoinCompass",
  tagline: "Live crypto markets & trading academy",
  description:
    "Live cryptocurrency prices, interactive charts, and in-depth guides on spot and futures trading, leverage, risk management, and long-term crypto investing.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  nav: [
    { label: "Markets", href: "/" },
    { label: "Academy", href: "/academy" },
    { label: "Investing Guide", href: "/investing-guide" },
  ],
};

export const riskDisclaimer =
  "Educational content only, not financial advice. Crypto assets are highly volatile and leveraged trading can lose more than your initial margin. Do your own research.";
