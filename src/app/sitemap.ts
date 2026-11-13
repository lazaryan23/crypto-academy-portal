import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { guides } from "@/content/academy";
import { popularCoinIds } from "@/content/coin-profiles";
import { getTopCoinIds } from "@/lib/coingecko";
import { pairSlug, popularPairs } from "@/lib/pairs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const coinIds = [...new Set([...popularCoinIds, ...(await getTopCoinIds(100))])];
  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/academy`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/investing-guide`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/tools`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/tools/calculator`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/tools/dca`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/compare`, changeFrequency: "daily", priority: 0.8 },
    ...popularPairs.map(([a, b]) => ({ url: `${base}/compare/${pairSlug(a, b)}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...guides.map((g) => ({ url: `${base}/academy/${g.slug}`, lastModified: g.updated, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...coinIds.map((id) => ({ url: `${base}/crypto/${id}`, changeFrequency: "hourly" as const, priority: popularCoinIds.includes(id) ? 0.7 : 0.6 })),
  ];
}
