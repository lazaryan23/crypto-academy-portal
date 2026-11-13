"use client";

import { useMemo, useState } from "react";
import { Alert, Badge, Box, Button, Card, CardSection, Group, Image, ScrollArea, SegmentedControl, Select, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconExternalLink, IconNews } from "@tabler/icons-react";
import { RelativeTime } from "@/components/common/RelativeTime";
import type { NewsCategory, NewsItem, NewsSource } from "@/lib/news";
import classes from "./NewsFeed.module.css";

type Tab = "all" | NewsCategory;

const tabs: { value: Tab; label: string }[] = [
  { value: "all", label: "All news" },
  { value: "bitcoin", label: "Bitcoin" },
  { value: "ethereum", label: "Ethereum" },
  { value: "markets", label: "Markets" },
  { value: "regulation", label: "Regulation" },
];

const categoryColors: Record<NewsCategory, string> = {
  bitcoin: "orange",
  ethereum: "indigo",
  markets: "teal",
  regulation: "grape",
};

const categoryLabels: Record<NewsCategory, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  markets: "Markets",
  regulation: "Regulation",
};

const PAGE_SIZE = 18;

function NewsCard({ item }: { item: NewsItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <Card
      withBorder
      padding="md"
      component="a"
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={classes.card}
      aria-label={`${item.title} (${item.source}, opens in a new tab)`}
    >
      <CardSection>
        {item.image && !imageFailed ? (
          <Image
            src={item.image}
            alt=""
            h={168}
            fit="cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className={classes.image}
          />
        ) : (
          <Box h={168} className={classes.placeholder}>
            <IconNews size={40} />
          </Box>
        )}
      </CardSection>
      <Stack gap={8} mt="md" style={{ flex: 1 }}>
        <Group gap={6} justify="space-between" wrap="nowrap">
          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
            <Text size="xs" fw={700} c="dimmed" truncate>
              {item.source}
            </Text>
            <Text size="xs" c="dimmed">
              ·
            </Text>
            <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
              <RelativeTime iso={item.publishedAt} />
            </Text>
          </Group>
          <IconExternalLink size={14} className={classes.external} aria-hidden />
        </Group>
        <Text fw={700} lineClamp={3} className={classes.title}>
          {item.title}
        </Text>
        {item.summary && (
          <Text size="sm" c="dimmed" lineClamp={3}>
            {item.summary}
          </Text>
        )}
        {item.categories.length > 0 && (
          <Group gap={6} mt="auto" pt={4}>
            {item.categories.map((category) => (
              <Badge key={category} size="xs" variant="light" color={categoryColors[category]}>
                {categoryLabels[category]}
              </Badge>
            ))}
          </Group>
        )}
      </Stack>
    </Card>
  );
}

export function NewsFeed({ items, sources, failedSources }: { items: NewsItem[]; sources: NewsSource[]; failedSources: string[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [source, setSource] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const counts = useMemo(() => {
    const result: Record<Tab, number> = { all: items.length, bitcoin: 0, ethereum: 0, markets: 0, regulation: 0 };
    items.forEach((item) => item.categories.forEach((category) => (result[category] += 1)));
    return result;
  }, [items]);

  const filtered = useMemo(
    () => items.filter((item) => (tab === "all" || item.categories.includes(tab)) && (!source || item.sourceId === source)),
    [items, tab, source],
  );

  const sourceOptions = sources
    .filter((s) => items.some((item) => item.sourceId === s.id))
    .map((s) => ({ value: s.id, label: s.name }));

  const changeTab = (value: string) => {
    setTab(value as Tab);
    setVisible(PAGE_SIZE);
  };

  if (!items.length) {
    return (
      <Alert color="gray" variant="light" title="News is temporarily unavailable">
        We couldn&apos;t reach any of our news sources just now. The feed refreshes automatically every few minutes.
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" gap="sm">
        <ScrollArea type="never" maw="100%">
          <SegmentedControl
            value={tab}
            onChange={changeTab}
            data={tabs.map((t) => ({ value: t.value, label: `${t.label} (${counts[t.value]})` }))}
            aria-label="News category"
          />
        </ScrollArea>
        <Select
          data={sourceOptions}
          value={source}
          onChange={(value) => {
            setSource(value);
            setVisible(PAGE_SIZE);
          }}
          placeholder="All sources"
          clearable
          aria-label="Filter by source"
          w={{ base: "100%", xs: 200 }}
        />
      </Group>

      {failedSources.length > 0 && (
        <Text size="xs" c="dimmed">
          {failedSources.join(", ")} {failedSources.length === 1 ? "is" : "are"} temporarily unavailable and will reappear on the next refresh.
        </Text>
      )}

      {filtered.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No stories match these filters right now.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {filtered.slice(0, visible).map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </SimpleGrid>
      )}

      {filtered.length > visible && (
        <Group justify="center">
          <Button variant="default" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Show more stories ({filtered.length - visible} left)
          </Button>
        </Group>
      )}
    </Stack>
  );
}
