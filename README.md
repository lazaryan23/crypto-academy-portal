# CoinCompass — Crypto Education & Analytics Portal

Live crypto market dashboard, coin detail pages with interactive charts, a futures trading academy and a long-term investing guide.

Built with Next.js 16 (App Router, Cache Components), Mantine 9, Tabler Icons, TradingView Lightweight Charts and the CoinGecko API.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL used for metadata, sitemap and JSON-LD |
| `COINGECKO_API_KEY` | Optional CoinGecko Demo API key (sent as `x-cg-demo-api-key`). Strongly recommended — the keyless public API is rate limited aggressively |

## Routes

| Route | Description |
| --- | --- |
| `/` | Live market dashboard: Top 10, Trending, Layer 1, DeFi, Meme; filter + auto-refresh every 60s |
| `/crypto/[id]` | Price chart (Lightweight Charts) + TradingView advanced chart, live stats, About & History, Where to Buy |
| `/academy` | Futures & Trading Academy index |
| `/academy/[slug]` | Guides with interactive long/short diagram, leverage/liquidation and position size calculators |
| `/investing-guide` | Long-term picks with live prices and an interactive allocation planner (60/30/10 etc.) |
| `/api/markets`, `/api/chart/[id]`, `/api/search` | Cached proxies to CoinGecko used for client-side revalidation |

## Project structure

```
src/
  app/                  routes, layouts, loading/error/not-found boundaries, sitemap, robots
  components/
    layout/             app shell, header coin search, footer
    market/             market dashboard, table, skeleton
    crypto/             price chart, TradingView widget, stats, about, where-to-buy
    academy/            guide renderer, interactive diagrams and calculators
    investing/          allocation planner, long-term picks
    common/             promo callout, exchange cards, link wrappers, shared UI
  config/
    affiliates.ts       referral URLs and promo codes for all exchanges
    site.ts             site name, navigation, disclaimer
  content/              academy guides, coin profiles, investing content
  lib/                  CoinGecko client (cached with "use cache"), formatters
  types/coingecko.ts    CoinGecko API types
```

## Affiliate links

Edit `src/config/affiliates.ts` to set referral URLs and promo codes for Binance, Bybit, OKX and BingX. Every banner, card and CTA across the site reads from this file. Make sure promotional copy (fee discounts, bonuses) matches the actual terms of each exchange's program.

## Caching

CoinGecko calls live in `src/lib/coingecko.ts` and use `"use cache"` with `cacheLife`, so markets revalidate every 60 seconds and coin pages every 2 minutes. Popular coin pages are prerendered via `generateStaticParams`; other coins are rendered on demand and cached.
