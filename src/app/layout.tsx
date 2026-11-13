import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/spotlight/styles.css";
import "./globals.css";
import { theme } from "@/theme";
import { siteConfig } from "@/config/site";
import { SiteShell } from "@/components/layout/SiteShell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MarketPulse, MarketPulseSkeleton } from "@/components/layout/MarketPulse";
import { Suspense } from "react";
import type { SpotlightIndex } from "@/components/layout/GlobalSpotlight";
import { guides } from "@/content/academy";
import { pairCoinNames, pairSlug, popularPairs } from "@/lib/pairs";
import { MotionProvider } from "@/components/motion/MotionProvider";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "crypto prices",
    "bitcoin price",
    "ethereum price",
    "crypto futures trading",
    "leverage trading guide",
    "crypto investing",
    "long and short positions",
  ],
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
};

const siteJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    alternateName: "Coin Compass",
    url: siteConfig.url,
    logo: `${siteConfig.url}/icon.svg`,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    name: siteConfig.name,
    alternateName: ["Coin Compass", "coincompass.org"],
    url: siteConfig.url,
    description: siteConfig.description,
    publisher: { "@id": `${siteConfig.url}/#organization` },
  },
];

const spotlightIndex: SpotlightIndex = {
  pages: [
    { label: "Markets", href: "/", description: "Live prices, watchlist and top movers" },
    { label: "Academy", href: "/academy", description: "Guides on futures, leverage and risk" },
    { label: "Crypto news", href: "/news", description: "Latest headlines from top publishers" },
    { label: "Market heatmap", href: "/heatmap", description: "Top 100 coins by size and performance" },
    { label: "Investing guide", href: "/investing-guide", description: "Long-term allocation and DCA" },
    { label: "Compare coins", href: "/compare", description: "Two coins on one chart" },
    { label: "DCA calculator", href: "/tools/dca", description: "Backtest weekly or monthly buys" },
    { label: "Profit & tax calculator", href: "/tools/calculator", description: "Profit, loss and ROI after fees" },
    { label: "Gas tracker & converter", href: "/tools/gas-converter", description: "Live BTC fees, ETH gas and fiat conversion" },
    { label: "All tools", href: "/tools", description: "Calculators and comparisons" },
  ],
  guides: guides.map((guide) => ({ label: guide.shortTitle, href: `/academy/${guide.slug}`, description: guide.level })),
  pairs: popularPairs.map(([a, b]) => ({ label: `${pairCoinNames[a] ?? a} vs ${pairCoinNames[b] ?? b}`, href: `/compare/${pairSlug(a, b)}` })),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd).replace(/</g, "\\u003c") }} />
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <MotionProvider>
            <SiteShell
              footer={<SiteFooter />}
              spotlightIndex={spotlightIndex}
              pulse={
                <Suspense fallback={<MarketPulseSkeleton />}>
                  <MarketPulse />
                </Suspense>
              }
            >
              {children}
            </SiteShell>
          </MotionProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
