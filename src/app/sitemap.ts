import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { guides } from "@/content/academy";
import { popularCoinIds } from "@/content/coin-profiles";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  return [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/academy`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/investing-guide`, changeFrequency: "weekly", priority: 0.9 },
    ...guides.map((g) => ({ url: `${base}/academy/${g.slug}`, lastModified: g.updated, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...popularCoinIds.map((id) => ({ url: `${base}/crypto/${id}`, changeFrequency: "hourly" as const, priority: 0.7 })),
  ];
}
