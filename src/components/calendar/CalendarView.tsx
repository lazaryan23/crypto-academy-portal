"use client";

import { useMemo, useState } from "react";
import { Avatar, Badge, Group, Paper, SegmentedControl, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { IconBuildingBank, IconLockOpen } from "@tabler/icons-react";
import Link from "next/link";
import { formatCompactUsd } from "@/lib/format";
import type { CalendarEvent, CalendarSnapshot, Impact, MacroEvent, UnlockEvent } from "@/lib/calendar-config";

const DAY_MS = 86_400_000;
const IMPACT_COLOR: Record<Impact, string> = { high: "red", medium: "orange", low: "gray" };
const IMPACT_RANK: Record<Impact, number> = { high: 3, medium: 2, low: 1 };

type Range = "7" | "30" | "90";
type Kind = "all" | "unlock" | "macro";
type ImpactFilter = "all" | "medium" | "high";

function dayKey(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}

function dayLabel(key: string) {
  const date = new Date(`${key}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function utcTime(ts: number) {
  return `${new Date(ts).toISOString().slice(11, 16)} UTC`;
}

function compactTokens(value: number) {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

function ImpactBadge({ impact }: { impact: Impact }) {
  return (
    <Badge size="xs" variant="light" color={IMPACT_COLOR[impact]}>
      {impact} impact
    </Badge>
  );
}

function UnlockCard({ event }: { event: UnlockEvent }) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          {event.image ? (
            <Avatar src={event.image} size={32} alt="" />
          ) : (
            <ThemeIcon size={32} radius="xl" variant="light">
              <IconLockOpen size={18} />
            </ThemeIcon>
          )}
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Group gap={6} wrap="wrap">
              <Text fw={700} component={Link} href={`/crypto/${event.coinId}`} c="inherit" style={{ textDecoration: "none" }}>
                {event.symbol} unlock
              </Text>
              <ImpactBadge impact={event.impact} />
            </Group>
            <Text size="xs" c="dimmed" lineClamp={1}>
              {event.recipients.length ? event.recipients.join(", ") : event.name}
            </Text>
          </Stack>
        </Group>
        <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
          <Text fw={800} ff="monospace">
            {event.usd !== null ? formatCompactUsd(event.usd) : "—"}
          </Text>
          <Text size="xs" c="dimmed" ff="monospace">
            {compactTokens(event.tokens)} {event.symbol}
          </Text>
          {event.pctOfCirculating !== null && (
            <Tooltip label="Share of the tokens currently in circulation" withArrow>
              <Text size="xs" fw={700} ff="monospace" c={IMPACT_COLOR[event.impact]}>
                {event.pctOfCirculating >= 10 ? event.pctOfCirculating.toFixed(0) : event.pctOfCirculating.toFixed(2)}% of supply
              </Text>
            </Tooltip>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}

function MacroCard({ event }: { event: MacroEvent }) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <ThemeIcon size={32} radius="xl" variant="light" color="indigo">
            <IconBuildingBank size={18} />
          </ThemeIcon>
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Group gap={6} wrap="wrap">
              <Badge size="xs" variant="outline" color="gray">
                {event.country}
              </Badge>
              <Text fw={700}>{event.title}</Text>
              <ImpactBadge impact={event.impact} />
            </Group>
            <Text size="xs" c="dimmed">
              {utcTime(event.date)} · {event.source}
            </Text>
          </Stack>
        </Group>
        {(event.forecast || event.previous) && (
          <Stack gap={0} align="flex-end" style={{ flexShrink: 0 }}>
            <Text size="xs" c="dimmed">
              Forecast{" "}
              <Text span fw={700} ff="monospace" c="var(--mantine-color-text)">
                {event.forecast ?? "—"}
              </Text>
            </Text>
            <Text size="xs" c="dimmed">
              Previous{" "}
              <Text span ff="monospace">
                {event.previous ?? "—"}
              </Text>
            </Text>
          </Stack>
        )}
      </Group>
    </Paper>
  );
}

export function CalendarView({ snapshot }: { snapshot: CalendarSnapshot }) {
  const [range, setRange] = useState<Range>("30");
  const [kind, setKind] = useState<Kind>("all");
  const [impact, setImpact] = useState<ImpactFilter>("all");
  const startedAt = useMemo(() => Date.parse(snapshot.updatedAt), [snapshot.updatedAt]);

  const groups = useMemo(() => {
    const until = startedAt + Number(range) * DAY_MS;
    const minRank = impact === "all" ? 0 : IMPACT_RANK[impact];
    const filtered = snapshot.events.filter((event) => event.date <= until && (kind === "all" || event.kind === kind) && IMPACT_RANK[event.impact] >= minRank);
    const byDay = new Map<string, CalendarEvent[]>();
    for (const event of filtered) {
      const key = dayKey(event.date);
      byDay.set(key, [...(byDay.get(key) ?? []), event]);
    }
    return [...byDay.entries()];
  }, [snapshot.events, startedAt, range, kind, impact]);

  const unlockTotal = useMemo(
    () => groups.flatMap(([, events]) => events).reduce((sum, event) => sum + (event.kind === "unlock" ? (event.usd ?? 0) : 0), 0),
    [groups],
  );

  return (
    <Stack gap="lg">
      <Group justify="space-between" gap="sm">
        <Group gap="xs" wrap="wrap">
          <SegmentedControl
            size="xs"
            value={range}
            onChange={(value) => setRange(value as Range)}
            data={[
              { value: "7", label: "7 days" },
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
            ]}
            aria-label="Date range"
          />
          <SegmentedControl
            size="xs"
            value={kind}
            onChange={(value) => setKind(value as Kind)}
            data={[
              { value: "all", label: "All" },
              { value: "unlock", label: "Token unlocks" },
              { value: "macro", label: "Macro" },
            ]}
            aria-label="Event type"
          />
          <SegmentedControl
            size="xs"
            value={impact}
            onChange={(value) => setImpact(value as ImpactFilter)}
            data={[
              { value: "all", label: "Any impact" },
              { value: "medium", label: "Medium+" },
              { value: "high", label: "High" },
            ]}
            aria-label="Impact"
          />
        </Group>
        <Text size="sm" c="dimmed">
          Unlocks in range:{" "}
          <Text span fw={700} ff="monospace" c="var(--mantine-color-text)">
            {formatCompactUsd(unlockTotal)}
          </Text>{" "}
          · times in UTC
        </Text>
      </Group>

      {groups.map(([key, events]) => (
        <Stack key={key} gap="xs">
          <Text fw={800} size="sm" tt="uppercase" c="dimmed">
            {dayLabel(key)}
          </Text>
          {events.map((event) => (event.kind === "unlock" ? <UnlockCard key={event.id} event={event} /> : <MacroCard key={event.id} event={event} />))}
        </Stack>
      ))}
      {!groups.length && (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          Nothing scheduled for these filters.
        </Text>
      )}
    </Stack>
  );
}
