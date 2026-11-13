import type { Metadata } from "next";
import { Suspense } from "react";
import { Anchor, Container, Group, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { NewsFeed } from "@/components/news/NewsFeed";
import { defaultOgImages } from "@/config/site";
import { getNewsFeed, newsSources } from "@/lib/news";

export const metadata: Metadata = {
  title: "Crypto News Today — Latest Bitcoin, Ethereum & Market Headlines",
  description:
    "The latest crypto news from CoinDesk, Cointelegraph, Decrypt, The Block and Bitcoin Magazine in one feed, sorted by time and filterable by Bitcoin, Ethereum, markets and regulation.",
  alternates: { canonical: "/news" },
  openGraph: { url: "/news", images: defaultOgImages },
};

async function NewsLoader() {
  const feed = await getNewsFeed();
  return <NewsFeed items={feed.items} sources={feed.sources} failedSources={feed.failedSources} />;
}

function NewsSkeleton() {
  return (
    <Stack gap="lg">
      <Skeleton h={36} w={520} maw="100%" radius="md" />
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} h={360} radius="md" />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

export default function NewsPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Stack gap="sm" maw={780}>
          <Title order={1} fz={{ base: 30, sm: 42 }} lh={1.15}>
            Crypto news
          </Title>
          <Text c="dimmed" size="lg">
            The latest headlines from leading crypto publishers in one place, refreshed every few minutes. Stories open on the publisher&apos;s site.
          </Text>
        </Stack>

        <Suspense fallback={<NewsSkeleton />}>
          <NewsLoader />
        </Suspense>

        <Group gap={6} wrap="wrap">
          <Text size="xs" c="dimmed">
            Headlines and summaries via the public RSS feeds of
          </Text>
          {newsSources.map((source, i) => (
            <Text key={source.id} size="xs" c="dimmed">
              <Anchor href={source.homepage} target="_blank" rel="noopener noreferrer" size="xs" c="dimmed" underline="always">
                {source.name}
              </Anchor>
              {i < newsSources.length - 1 ? "," : "."}
            </Text>
          ))}
          <Text size="xs" c="dimmed">
            Categories are assigned automatically from each headline.
          </Text>
        </Group>
      </Stack>
    </Container>
  );
}
