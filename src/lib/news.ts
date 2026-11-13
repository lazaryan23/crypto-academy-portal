import { cacheLife } from "next/cache";
import { XMLParser } from "fast-xml-parser";

export type NewsCategory = "bitcoin" | "ethereum" | "markets" | "regulation";

export interface NewsSource {
  id: string;
  name: string;
  feed: string;
  homepage: string;
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  sourceId: string;
  source: string;
  publishedAt: string;
  summary: string;
  image: string | null;
  categories: NewsCategory[];
}

export interface NewsFeed {
  items: NewsItem[];
  sources: NewsSource[];
  failedSources: string[];
}

export const newsSources: NewsSource[] = [
  { id: "coindesk", name: "CoinDesk", feed: "https://www.coindesk.com/arc/outboundfeeds/rss", homepage: "https://www.coindesk.com" },
  { id: "cointelegraph", name: "Cointelegraph", feed: "https://cointelegraph.com/rss", homepage: "https://cointelegraph.com" },
  { id: "decrypt", name: "Decrypt", feed: "https://decrypt.co/feed", homepage: "https://decrypt.co" },
  { id: "theblock", name: "The Block", feed: "https://www.theblock.co/rss.xml", homepage: "https://www.theblock.co" },
  { id: "bitcoinmagazine", name: "Bitcoin Magazine", feed: "https://bitcoinmagazine.com/feed", homepage: "https://bitcoinmagazine.com" },
];

const PER_SOURCE_LIMIT = 25;
const FEED_LIMIT = 90;
const SUMMARY_LENGTH = 220;
const USER_AGENT = "Mozilla/5.0 (compatible; CoinCompassBot/1.0; +https://www.coincompass.org)";

const categoryPatterns: Record<NewsCategory, RegExp> = {
  bitcoin: /\bbitcoin|\bbtc\b|lightning network|\bsatoshi/i,
  ethereum: /\bethereum|\beth\b|\bether\b|vitalik|\blayer[- ]?2\b|\bl2s?\b|arbitrum|optimism/i,
  markets:
    /\bprices?\b|\bmarkets?\b|\brall(y|ies|ied)\b|sell-?off|\bsurges?\b|\bplunges?\b|\bslumps?\b|\betfs?\b|\binflows?\b|\boutflows?\b|\btraders?\b|liquidat|\bbull(ish|s)?\b|\bbear(ish|s)?\b|all-time high|\banalysis\b|\bresistance\b|\brate cuts?\b|\bstocks?\b|\btrading\b|moving average|\b(drops?|falls?|jumps?|climbs?|slides?|tumbles?|soars?)\b/i,
  regulation:
    /\bsec\b|regulat|lawsuit|\bcourts?\b|\bjudge\b|\bban(s|ned)?\b|\bbills?\b|congress|senate|legislat|\btax(es|ation)?\b|\bcftc\b|sanction|compliance|\blicen[cs]e|\bpolicy\b|government|central bank|\bcbdc\b|\bcharged\b|\bprosecut/i,
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: false,
  processEntities: true,
  htmlEntities: true,
  trimValues: true,
});

type XmlValue = string | number | boolean | { [key: string]: XmlValue } | XmlValue[] | null | undefined;
type XmlNode = { [key: string]: XmlValue };

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: XmlValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return text(value[0]);
  return text(value["#text"]);
}

function attribute(value: XmlValue, name: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return text(value[`@_${name}`]);
}

function decodeEntities(input: string) {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", mdash: "—", ndash: "–" };
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function plainText(html: string) {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function leadIn(summary: string, sourceName: string, title: string) {
  let rest = summary;
  if (rest.startsWith(sourceName)) rest = rest.slice(sourceName.length).trimStart();
  if (rest.startsWith(title)) rest = rest.slice(title.length).trimStart();
  return rest;
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trimEnd()}…`;
}

function safeUrl(raw: string, requireHttps = false): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && (requireHttps || url.protocol !== "http:")) return null;
    for (const key of [...url.searchParams.keys()]) if (key.startsWith("utm_")) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return null;
  }
}

function findImage(item: XmlNode, description: string): string | null {
  const candidates: string[] = [];
  for (const media of asArray(item["media:content"])) {
    const type = attribute(media, "type");
    const medium = attribute(media, "medium");
    if (!type || type.startsWith("image/") || medium === "image") candidates.push(attribute(media, "url"));
  }
  for (const thumb of asArray(item["media:thumbnail"])) candidates.push(attribute(thumb, "url"));
  for (const enclosure of asArray(item.enclosure)) {
    if (attribute(enclosure, "type").startsWith("image/")) candidates.push(attribute(enclosure, "url"));
  }
  const inline = /<img[^>]+src=["']([^"']+)["']/i.exec(`${description} ${text(item["content:encoded"])}`);
  if (inline) candidates.push(decodeEntities(inline[1]));
  for (const candidate of candidates) {
    const url = candidate && safeUrl(candidate, true);
    if (url) return url;
  }
  return null;
}

function categorize(title: string, tags: string[]): NewsCategory[] {
  const haystack = `${title} ${tags.join(" ")}`;
  return (Object.keys(categoryPatterns) as NewsCategory[]).filter((category) => categoryPatterns[category].test(haystack));
}

export function parseFeed(xml: string, source: NewsSource): NewsItem[] {
  const doc = parser.parse(xml) as XmlNode;
  const channel = (doc.rss as XmlNode | undefined)?.channel as XmlNode | undefined;
  const items = asArray(channel?.item as XmlNode | XmlNode[] | undefined);
  const results: NewsItem[] = [];

  for (const item of items.slice(0, PER_SOURCE_LIMIT)) {
    const title = plainText(text(item.title));
    const url = safeUrl(text(item.link) || text(item.guid));
    const date = new Date(text(item.pubDate) || text(item["dc:date"]));
    if (!title || !url || Number.isNaN(date.getTime())) continue;
    const description = text(item.description);
    const summary = truncate(leadIn(plainText(description), source.name, title), SUMMARY_LENGTH);
    const tags = asArray(item.category).map((tag) => plainText(text(tag)));
    results.push({
      id: `${source.id}:${url}`,
      title,
      url,
      sourceId: source.id,
      source: source.name,
      publishedAt: date.toISOString(),
      summary: summary === title ? "" : summary,
      image: findImage(item, description),
      categories: categorize(title, tags),
    });
  }
  return results;
}

async function cachedSource(sourceId: string): Promise<{ ok: boolean; items: NewsItem[] }> {
  "use cache";
  const source = newsSources.find((s) => s.id === sourceId);
  if (!source) return { ok: false, items: [] };
  try {
    const res = await fetch(source.feed, {
      headers: { "user-agent": USER_AGENT, accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`${source.feed} → ${res.status}`);
    const items = parseFeed(await res.text(), source);
    if (!items.length) throw new Error(`${source.feed} → no items`);
    cacheLife({ stale: 300, revalidate: 600, expire: 86400 });
    return { ok: true, items };
  } catch {
    cacheLife({ stale: 0, revalidate: 120, expire: 600 });
    return { ok: false, items: [] };
  }
}

function titleKey(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function getNewsFeed(): Promise<NewsFeed> {
  const results = await Promise.all(newsSources.map((source) => cachedSource(source.id)));
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const items = results
    .flatMap((result) => result.items)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter((item) => {
      const key = titleKey(item.title);
      if (seenUrls.has(item.url) || seenTitles.has(key)) return false;
      seenUrls.add(item.url);
      seenTitles.add(key);
      return true;
    })
    .slice(0, FEED_LIMIT);
  return {
    items,
    sources: newsSources,
    failedSources: newsSources.filter((_, i) => !results[i].ok).map((s) => s.name),
  };
}
