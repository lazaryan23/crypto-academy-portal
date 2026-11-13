import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar, Breadcrumbs, Container, Group, Paper, SimpleGrid, Skeleton, Stack, Table, TableScrollContainer, TableTbody, TableTd, TableTh, TableThead, TableTr, Text, Title } from "@mantine/core";
import { AnchorLink, CardLink } from "@/components/common/Links";
import { Disclaimer } from "@/components/common/Disclaimer";
import { CompareChart, type CompareSeries } from "@/components/compare/CompareChart";
import { PairPicker, type CoinOption } from "@/components/compare/PairPicker";
import { PercentChange } from "@/components/common/PercentChange";
import { coinProfiles, popularCoinIds } from "@/content/coin-profiles";
import { getPairMarkets } from "@/lib/compare";
import { canonicalPairSlug, pairCoinNames, pairSlug, parsePair, periodReturn, popularPairs } from "@/lib/pairs";
import { getMarketChart, getMarkets } from "@/lib/coingecko";
import { formatCompactUsd, formatDate, formatPercent, formatPrice, formatSupply } from "@/lib/format";
import { siteConfig } from "@/config/site";
import type { CoinMarket } from "@/types/coingecko";

const colors = ["#f59f00", "#4dabf7"];

export function generateStaticParams() {
  return popularPairs.map(([a, b]) => ({ pair: pairSlug(a, b) }));
}

async function loadPair(slug: string) {
  const ids = parsePair(slug);
  if (!ids) notFound();
  const coins = await getPairMarkets(ids[0], ids[1]);
  if (!coins) notFound();
  return coins;
}

export async function generateMetadata({ params }: PageProps<"/compare/[pair]">): Promise<Metadata> {
  const { pair } = await params;
  const ids = parsePair(pair);
  if (!ids) return { title: "Comparison not found", robots: { index: false } };
  const canonical = `/compare/${canonicalPairSlug(ids[0], ids[1])}`;
  try {
    const coins = await getPairMarkets(ids[0], ids[1]);
    if (!coins) return { title: "Comparison not found", robots: { index: false } };
    const [a, b] = coins;
    const [sa, sb] = [a.symbol.toUpperCase(), b.symbol.toUpperCase()];
    const title = `${a.name} vs ${b.name} (${sa} vs ${sb}): Price, Performance & Market Cap`;
    const description = `Compare ${a.name} and ${b.name} side by side: 1-year returns on one chart, market cap, volume, supply, all-time highs and how each network works.`;
    return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical } };
  } catch {
    return { title: "Crypto comparison", alternates: { canonical } };
  }
}

function MetricRow({ label, a, b }: { label: string; a: React.ReactNode; b: React.ReactNode }) {
  return (
    <TableTr>
      <TableTd>
        <Text size="sm" c="dimmed">
          {label}
        </Text>
      </TableTd>
      <TableTd ta="right">{a}</TableTd>
      <TableTd ta="right">{b}</TableTd>
    </TableTr>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <Text size="sm" ff="monospace" fw={600} component="span">
      {children}
    </Text>
  );
}

function summary(a: CoinMarket, b: CoinMarket, ra: number | null, rb: number | null) {
  const parts: string[] = [];
  if (ra !== null && rb !== null) {
    const leader = ra >= rb ? a : b;
    parts.push(
      `Over the past year ${a.name} returned ${formatPercent(ra)} and ${b.name} returned ${formatPercent(rb)}, so ${leader.name} came out ahead by ${Math.abs(ra - rb).toFixed(1)} percentage points.`,
    );
  }
  if (a.market_cap && b.market_cap) {
    const [big, small] = a.market_cap >= b.market_cap ? [a, b] : [b, a];
    parts.push(`${big.name}'s market cap is ${((big.market_cap ?? 0) / (small.market_cap ?? 1)).toFixed(1)}× the size of ${small.name}'s.`);
  }
  return parts.join(" ");
}

async function coinOptions(current: CoinMarket[]): Promise<CoinOption[]> {
  const popular = await getMarkets({ ids: popularCoinIds, perPage: popularCoinIds.length }).catch(() => []);
  const byId = new Map<string, CoinOption>();
  [...popular, ...current].forEach((coin) => byId.set(coin.id, { value: coin.id, label: `${coin.name} (${coin.symbol.toUpperCase()})` }));
  return [...byId.values()];
}

async function CompareContent({ params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params;
  const [a, b] = await loadPair(pair);
  const [chartA, chartB, options] = await Promise.all([
    getMarketChart(a.id, "365").then((c) => c.prices).catch(() => null),
    getMarketChart(b.id, "365").then((c) => c.prices).catch(() => null),
    coinOptions([a, b]),
  ]);
  const ra = periodReturn(chartA);
  const rb = periodReturn(chartB);
  const series: CompareSeries[] = [
    { id: a.id, name: a.name, symbol: a.symbol, color: colors[0], points: chartA },
    { id: b.id, name: b.name, symbol: b.symbol, color: colors[1], points: chartB },
  ];
  const pa = coinProfiles[a.id];
  const pb = coinProfiles[b.id];
  const related = popularPairs.filter(([x, y]) => pairSlug(x, y) !== pair).slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Compare", item: `${siteConfig.url}/compare` },
      { "@type": "ListItem", position: 2, name: `${a.name} vs ${b.name}`, item: `${siteConfig.url}/compare/${pair}` },
    ],
  };

  return (
    <Stack gap="xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs>
        <AnchorLink href="/compare" size="sm">
          Compare
        </AnchorLink>
        <Text size="sm" c="dimmed">
          {a.name} vs {b.name}
        </Text>
      </Breadcrumbs>

      <Stack gap="sm">
        <Group gap="sm">
          <Avatar src={a.image} alt={a.name} size={40} />
          <Avatar src={b.image} alt={b.name} size={40} ml={-14} style={{ border: "2px solid var(--mantine-color-body)" }} />
        </Group>
        <Title order={1} fz={{ base: 28, sm: 38 }} lh={1.15}>
          {a.name} vs {b.name}
        </Title>
        <Text c="dimmed" maw={760}>
          {summary(a, b, ra, rb) || `How ${a.name} and ${b.name} compare on price performance, size and supply.`}
        </Text>
      </Stack>

      <PairPicker options={options} a={a.id} b={b.id} />

      <Paper withBorder p={{ base: "sm", sm: "md" }}>
        <CompareChart series={series} />
      </Paper>

      <Paper withBorder>
        <TableScrollContainer minWidth={420}>
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <TableThead>
              <TableTr>
                <TableTh />
                {[a, b].map((coin) => (
                  <TableTh key={coin.id} ta="right">
                    <AnchorLink href={`/crypto/${coin.id}`} fw={700}>
                      {coin.name}
                    </AnchorLink>
                  </TableTh>
                ))}
              </TableTr>
            </TableThead>
            <TableTbody>
              <MetricRow label="Price" a={<Mono>{formatPrice(a.current_price)}</Mono>} b={<Mono>{formatPrice(b.current_price)}</Mono>} />
              <MetricRow label="24h change" a={<PercentChange value={a.price_change_percentage_24h} />} b={<PercentChange value={b.price_change_percentage_24h} />} />
              <MetricRow
                label="7d change"
                a={<PercentChange value={a.price_change_percentage_7d_in_currency} />}
                b={<PercentChange value={b.price_change_percentage_7d_in_currency} />}
              />
              <MetricRow label="1-year return" a={<PercentChange value={ra} />} b={<PercentChange value={rb} />} />
              <MetricRow label="Market cap rank" a={<Mono>#{a.market_cap_rank ?? "—"}</Mono>} b={<Mono>#{b.market_cap_rank ?? "—"}</Mono>} />
              <MetricRow label="Market cap" a={<Mono>{formatCompactUsd(a.market_cap)}</Mono>} b={<Mono>{formatCompactUsd(b.market_cap)}</Mono>} />
              <MetricRow label="24h volume" a={<Mono>{formatCompactUsd(a.total_volume)}</Mono>} b={<Mono>{formatCompactUsd(b.total_volume)}</Mono>} />
              <MetricRow
                label="Circulating supply"
                a={<Mono>{formatSupply(a.circulating_supply, a.symbol)}</Mono>}
                b={<Mono>{formatSupply(b.circulating_supply, b.symbol)}</Mono>}
              />
              <MetricRow
                label="Max supply"
                a={<Mono>{a.max_supply ? formatSupply(a.max_supply, a.symbol) : "No cap"}</Mono>}
                b={<Mono>{b.max_supply ? formatSupply(b.max_supply, b.symbol) : "No cap"}</Mono>}
              />
              <MetricRow label="All-time high" a={<Mono>{formatPrice(a.ath)}</Mono>} b={<Mono>{formatPrice(b.ath)}</Mono>} />
              <MetricRow label="From all-time high" a={<PercentChange value={a.ath_change_percentage} />} b={<PercentChange value={b.ath_change_percentage} />} />
              <MetricRow label="ATH date" a={<Text size="sm">{formatDate(a.ath_date)}</Text>} b={<Text size="sm">{formatDate(b.ath_date)}</Text>} />
              {(pa || pb) && (
                <>
                  <MetricRow label="Launched" a={<Text size="sm">{pa?.launched ?? "—"}</Text>} b={<Text size="sm">{pb?.launched ?? "—"}</Text>} />
                  <MetricRow label="Consensus" a={<Text size="sm">{pa?.consensus ?? "—"}</Text>} b={<Text size="sm">{pb?.consensus ?? "—"}</Text>} />
                </>
              )}
            </TableTbody>
          </Table>
        </TableScrollContainer>
      </Paper>

      {(pa || pb) && (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {[
            { coin: a, profile: pa },
            { coin: b, profile: pb },
          ].map(({ coin, profile }) =>
            profile ? (
              <Paper key={coin.id} withBorder p="lg">
                <Title order={2} size="h4" mb="xs">
                  What is {coin.name}?
                </Title>
                <Text size="sm" mb="sm">
                  {profile.summary}
                </Text>
                <Text size="sm" c="dimmed">
                  Used for: {profile.useCases.join(" · ")}
                </Text>
              </Paper>
            ) : null,
          )}
        </SimpleGrid>
      )}

      <Stack gap="sm">
        <Title order={2} size="h4">
          More comparisons
        </Title>
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="sm">
          {related.map(([x, y]) => (
            <CardLink key={pairSlug(x, y)} href={`/compare/${pairSlug(x, y)}`} withBorder padding="sm">
              <Text size="sm" fw={600}>
                {pairCoinNames[x] ?? x} vs {pairCoinNames[y] ?? y}
              </Text>
            </CardLink>
          ))}
        </SimpleGrid>
      </Stack>

      <Disclaimer />
    </Stack>
  );
}

function CompareSkeleton() {
  return (
    <Stack gap="xl">
      <Skeleton h={18} w={200} />
      <Skeleton h={44} w="60%" />
      <Skeleton h={420} radius="md" />
      <Skeleton h={480} radius="md" />
    </Stack>
  );
}

export default function ComparePage({ params }: PageProps<"/compare/[pair]">) {
  return (
    <Container size="xl" py="xl">
      <Suspense fallback={<CompareSkeleton />}>
        <CompareContent params={params} />
      </Suspense>
    </Container>
  );
}
