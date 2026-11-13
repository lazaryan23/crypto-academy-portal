import { Anchor, Badge, Card, Group, List, ListItem, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCalendar, IconCircleCheck, IconCpu, IconExternalLink, IconUsers } from "@tabler/icons-react";
import type { CoinDetail } from "@/types/coingecko";
import { coinProfiles } from "@/content/coin-profiles";
import { formatDate, stripHtml, toParagraphs } from "@/lib/format";

function Fact({ icon: Icon, label, value }: { icon: typeof IconUsers; label: string; value: string }) {
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      <ThemeIcon variant="light" size={36} radius="md">
        <Icon size={18} />
      </ThemeIcon>
      <Stack gap={0}>
        <Text size="xs" c="dimmed" fw={600}>
          {label}
        </Text>
        <Text size="sm" fw={500}>
          {value}
        </Text>
      </Stack>
    </Group>
  );
}

export function CoinAbout({ coin }: { coin: CoinDetail }) {
  const profile = coinProfiles[coin.id];
  const paragraphs = toParagraphs(stripHtml(coin.description.en ?? ""), 5);
  const homepage = coin.links.homepage.find(Boolean);
  const whitepaper = coin.links.whitepaper || undefined;
  const categories = coin.categories.filter(Boolean).slice(0, 6);

  return (
    <Card padding="xl" component="section" aria-labelledby="about-heading">
      <Stack gap="lg">
        <Title order={2} size="h3" id="about-heading">
          About {coin.name} & its history
        </Title>

        {profile && <Text size="lg">{profile.summary}</Text>}

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Fact icon={IconUsers} label="Created by" value={profile?.creators ?? "See project documentation"} />
          <Fact
            icon={IconCalendar}
            label="Launched"
            value={profile?.launched ?? (coin.genesis_date ? formatDate(coin.genesis_date) : "—")}
          />
          <Fact icon={IconCpu} label="Consensus" value={profile?.consensus ?? coin.hashing_algorithm ?? "—"} />
        </SimpleGrid>

        {profile && (
          <Stack gap="xs">
            <Text fw={700}>Main use cases</Text>
            <List
              spacing={6}
              icon={
                <ThemeIcon size={20} radius="xl" color="teal" variant="light">
                  <IconCircleCheck size={14} />
                </ThemeIcon>
              }
            >
              {profile.useCases.map((u) => (
                <ListItem key={u}>{u}</ListItem>
              ))}
            </List>
          </Stack>
        )}

        {paragraphs.length > 0 && (
          <div className="prose">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {categories.length > 0 && (
          <Group gap={6}>
            {categories.map((c) => (
              <Badge key={c} variant="outline" color="gray" tt="none">
                {c}
              </Badge>
            ))}
          </Group>
        )}

        <Group gap="lg">
          {homepage && (
            <Anchor href={homepage} target="_blank" rel="noopener nofollow" size="sm">
              <Group gap={4}>
                Official website <IconExternalLink size={14} />
              </Group>
            </Anchor>
          )}
          {whitepaper && (
            <Anchor href={whitepaper} target="_blank" rel="noopener nofollow" size="sm">
              <Group gap={4}>
                Whitepaper <IconExternalLink size={14} />
              </Group>
            </Anchor>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
