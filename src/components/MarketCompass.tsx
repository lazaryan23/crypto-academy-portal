"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Grid,
  GridCol,
  Group,
  Paper,
  Popover,
  PopoverDropdown,
  PopoverTarget,
  Progress,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDocumentVisibility } from "@mantine/hooks";
import { IconAlertCircle, IconCompass, IconInfoCircle } from "@tabler/icons-react";
import { COMPASS_TIMEFRAMES, TIMEFRAME_LABELS, describeIndex, type CompassTimeframe, type PressureReading } from "@/lib/buy-pressure";
import { formatCompactUsd } from "@/lib/format";
import { CompassDial } from "./compass/CompassDial";
import { CompassDetailModal } from "./compass/CompassDetailModal";
import { useCompassFeed, type CompassStatus } from "./compass/useCompassFeed";

const OFFSCREEN_GRACE_MS = 15_000;
const LEADERBOARD_SIZE = 6;

const statusStyle: Record<CompassStatus, { color: string; label: string }> = {
  live: { color: "teal", label: "Live" },
  connecting: { color: "yellow", label: "Connecting" },
  paused: { color: "gray", label: "Paused" },
  offline: { color: "red", label: "Reconnecting" },
};

function useOnScreen(ref: React.RefObject<HTMLElement | null>) {
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer);
        if (entry.isIntersecting) setOnScreen(true);
        else timer = setTimeout(() => setOnScreen(false), OFFSCREEN_GRACE_MS);
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(node);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [ref]);
  return onScreen;
}

function signedUsd(value: number) {
  return `${value >= 0 ? "+" : "−"}${formatCompactUsd(Math.abs(value))}`;
}

function Leaderboard({ readings, leaderId, onSelect }: { readings: PressureReading[]; leaderId: string | null; onSelect: (id: string) => void }) {
  return (
    <Stack gap={4}>
      {readings.slice(0, LEADERBOARD_SIZE).map((reading, i) => {
        const mood = describeIndex(reading.index);
        return (
          <UnstyledButton
            key={reading.id}
            onClick={() => onSelect(reading.id)}
            p="xs"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              border: `1px solid ${reading.id === leaderId ? "var(--mantine-color-brand-filled)" : "transparent"}`,
            }}
            aria-label={`${reading.name} buy pressure details`}
          >
            <Group gap="sm" wrap="nowrap">
              <Text size="xs" c="dimmed" w={14} ta="right">
                {i + 1}
              </Text>
              <Avatar src={reading.image || null} name={reading.symbol} color="initials" alt="" size={24} />
              <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <Text size="sm" fw={700} truncate>
                    {reading.symbol}
                  </Text>
                  <Text size="xs" ff="monospace" c={reading.netUsd >= 0 ? "teal" : "red"} style={{ whiteSpace: "nowrap" }}>
                    {signedUsd(reading.netUsd)}
                    {reading.spike !== null && (
                      <Text span c="dimmed" inherit>
                        {" "}
                        · ×{reading.spike.toFixed(1)}
                      </Text>
                    )}
                  </Text>
                </Group>
                <Progress value={reading.index} size="sm" radius="xl" color={mood.color} aria-label={`BPI ${Math.round(reading.index)}`} />
              </Stack>
              <Text size="sm" fw={700} ff="monospace" w={28} ta="right">
                {Math.round(reading.index)}
              </Text>
            </Group>
          </UnstyledButton>
        );
      })}
    </Stack>
  );
}

function MethodNote() {
  return (
    <Popover width={320} position="bottom-end" withArrow shadow="md">
      <PopoverTarget>
        <ActionIcon variant="subtle" color="gray" aria-label="How the Buy Pressure Index works">
          <IconInfoCircle size={18} />
        </ActionIcon>
      </PopoverTarget>
      <PopoverDropdown>
        <Stack gap="xs">
          <Text size="sm" fw={700}>
            How the Buy Pressure Index works
          </Text>
          <Text size="xs">
            For each coin we measure aggressive (taker) buying and selling on Binance USDT-M perpetuals over the selected window,
            streamed live minute by minute.
          </Text>
          <Text size="xs">
            The index (0–100) combines the net taker imbalance with how unusual the volume is versus the coin&apos;s 24h average. 50 is
            balanced; above 50 buyers are lifting offers.
          </Text>
          <Text size="xs">
            The needle points to the highest index among coins with net buying and enough volume to matter (thinnest 25% excluded).
          </Text>
          <Text size="xs" c="dimmed">
            Order flow is not a price prediction. Educational data only, not financial advice.
          </Text>
        </Stack>
      </PopoverDropdown>
    </Popover>
  );
}

export function MarketCompass() {
  const sectionRef = useRef<HTMLElement>(null);
  const visibility = useDocumentVisibility();
  const onScreen = useOnScreen(sectionRef);
  const { view, status, error, timeframe, setTimeframe } = useCompassFeed(visibility === "visible" && onScreen);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ? (view?.readings.find((r) => r.id === selectedId) ?? null) : null;
  const tfLabel = TIMEFRAME_LABELS[timeframe];
  const badge = statusStyle[status];

  return (
    <section ref={sectionRef} aria-labelledby="market-compass-title">
      <Paper withBorder p={{ base: "md", sm: "xl" }}>
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" gap="md">
            <Stack gap={4} style={{ flex: "1 1 280px" }}>
              <Group gap="xs" wrap="nowrap">
                <IconCompass size={22} color="var(--mantine-color-brand-filled)" aria-hidden="true" />
                <Title order={2} size="h3" id="market-compass-title">
                  Market Compass
                </Title>
                <Badge variant="dot" color={badge.color} size="sm">
                  {badge.label}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                Live buy pressure radar. The needle points to the coin with the strongest aggressive buying right now.
              </Text>
            </Stack>
            <Group gap="xs" wrap="nowrap">
              <SegmentedControl
                size="sm"
                value={timeframe}
                onChange={(value) => setTimeframe(value as CompassTimeframe)}
                data={COMPASS_TIMEFRAMES.map((tf) => ({ value: tf, label: TIMEFRAME_LABELS[tf] }))}
                aria-label="Buy pressure timeframe"
              />
              <MethodNote />
            </Group>
          </Group>

          {error && !view && (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />}>
              {error} Retrying automatically.
            </Alert>
          )}

          <Grid gap={{ base: "lg", md: 40 }} align="center">
            <GridCol span={{ base: 12, md: 7 }}>
              {view ? (
                <CompassDial
                  ring={view.ring}
                  leader={view.leader}
                  needleAngle={view.needleAngle}
                  timeframeLabel={tfLabel}
                  onSelect={setSelectedId}
                />
              ) : (
                <Skeleton circle mx="auto" style={{ width: "min(100%, 440px)", height: "auto", aspectRatio: "1" }} />
              )}
            </GridCol>
            <GridCol span={{ base: 12, md: 5 }}>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={700}>Strongest buy pressure · {tfLabel}</Text>
                  <Text size="xs" c="dimmed">
                    BPI
                  </Text>
                </Group>
                {view ? (
                  <Leaderboard readings={view.readings} leaderId={view.leader?.id ?? null} onSelect={setSelectedId} />
                ) : (
                  <Stack gap="sm">
                    {Array.from({ length: LEADERBOARD_SIZE }, (_, i) => (
                      <Skeleton key={i} height={44} radius="md" />
                    ))}
                  </Stack>
                )}
                <Text size="xs" c="dimmed">
                  {view ? `${view.trackedCount} largest coins with Binance USDT-M perpetuals. ` : ""}
                  Net = taker buys − taker sells; × = volume vs 24h average.
                </Text>
              </Stack>
            </GridCol>
          </Grid>
        </Stack>
      </Paper>

      <CompassDetailModal reading={selected} timeframeLabel={tfLabel} opened={selected !== null} onClose={() => setSelectedId(null)} />
    </section>
  );
}
