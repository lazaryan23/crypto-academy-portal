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
  ProgressRoot,
  ProgressSection,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDocumentVisibility } from "@mantine/hooks";
import { IconAlertCircle, IconCompass, IconInfoCircle } from "@tabler/icons-react";
import { formatCompactUsd, formatPercent } from "@/lib/format";
import { COMPASS_TIMEFRAMES, TIMEFRAME_LABELS, describeIndex, type CompassTimeframe, type PressureReading } from "@/lib/buy-pressure";
import { CompassDial } from "./compass/CompassDial";
import { CompassLoader } from "./compass/CompassLoader";
import { CompassDetailModal } from "./compass/CompassDetailModal";
import { useCompassFeed, type CompassStatus } from "./compass/useCompassFeed";
import classes from "./MarketCompass.module.css";

const OFFSCREEN_GRACE_MS = 15_000;
const DIAL_MAX = 420;
const RUNNER_COUNT = 5;

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

function Leader({ reading, timeframeLabel, onSelect }: { reading: PressureReading | null; timeframeLabel: string; onSelect: (id: string) => void }) {
  if (!reading) {
    return (
      <Paper withBorder p="md" radius="md">
        <Text size="sm" c="dimmed">
          No coin has clear net buying over the last {timeframeLabel}. The needle rests until buyers take control.
        </Text>
      </Paper>
    );
  }
  const mood = describeIndex(reading.index);
  return (
    <UnstyledButton
      onClick={() => onSelect(reading.id)}
      aria-label={`${reading.name} buy pressure details`}
      className={classes.leader}
    >
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Avatar src={reading.image || null} name={reading.symbol} color="initials" alt="" size={40} />
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Needle points to
              </Text>
              <Text fw={800} size="lg" truncate>
                {reading.symbol} <Text span size="sm" c="dimmed" fw={500}>{reading.name}</Text>
              </Text>
            </Stack>
          </Group>
          <Stack gap={0} align="flex-end">
            <Text fw={800} size="xl" ff="monospace" c="brand">
              {Math.round(reading.index)}
            </Text>
            <Badge size="xs" variant="light" color={mood.color}>
              {mood.label}
            </Badge>
          </Stack>
        </Group>
        <ProgressRoot size="sm" aria-label="Aggressive buys versus sells">
          <ProgressSection value={reading.buyShare * 100} color="teal" />
          <ProgressSection value={(1 - reading.buyShare) * 100} color="red" />
        </ProgressRoot>
        <Group justify="space-between" gap="xs">
          <Text size="xs" c="dimmed">
            Net flow <Text span fw={700} c={reading.netUsd >= 0 ? "teal" : "red"}>{formatCompactUsd(reading.netUsd)}</Text>
          </Text>
          <Text size="xs" c="dimmed">
            Price {timeframeLabel} <Text span fw={700} c={(reading.priceChange ?? 0) >= 0 ? "teal" : "red"}>{formatPercent(reading.priceChange)}</Text>
          </Text>
        </Group>
      </Stack>
    </UnstyledButton>
  );
}

function Runners({ readings, leaderId, onSelect }: { readings: PressureReading[]; leaderId: string | null; onSelect: (id: string) => void }) {
  const runners = readings.filter((r) => r.id !== leaderId).slice(0, RUNNER_COUNT);
  return (
    <Stack gap={6}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        Next strongest
      </Text>
      {runners.map((reading, i) => (
        <UnstyledButton
          key={reading.id}
          onClick={() => onSelect(reading.id)}
          aria-label={`${reading.name} buy pressure details`}
          className={classes.runner}
        >
          <Group gap="sm" wrap="nowrap">
            <Text size="xs" c="dimmed" w={14}>
              {i + 2}
            </Text>
            <Avatar src={reading.image || null} name={reading.symbol} color="initials" alt="" size={24} />
            <Text size="sm" fw={700} truncate style={{ flex: 1, minWidth: 0 }}>
              {reading.symbol}
            </Text>
            <Progress value={reading.index} size="xs" w={72} color={describeIndex(reading.index).color} aria-hidden="true" />
            <Text size="sm" fw={700} ff="monospace" w={28} ta="right" c={describeIndex(reading.index).color}>
              {Math.round(reading.index)}
            </Text>
          </Group>
        </UnstyledButton>
      ))}
    </Stack>
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

  const timeframeControl = (
    <Group gap={4} wrap="nowrap">
      <SegmentedControl
        size="xs"
        value={timeframe}
        onChange={(value) => setTimeframe(value as CompassTimeframe)}
        data={COMPASS_TIMEFRAMES.map((tf) => ({ value: tf, label: TIMEFRAME_LABELS[tf] }))}
        aria-label="Buy pressure timeframe"
      />
      <MethodNote />
    </Group>
  );

  const header = (
    <Group justify="space-between" align="flex-start" gap="sm">
      <Stack gap={4} style={{ flex: "1 1 200px" }}>
        <Group gap="xs" wrap="nowrap">
          <IconCompass size={20} color="var(--mantine-color-brand-filled)" aria-hidden="true" />
          <Title order={2} size="h4" id="market-compass-title">
            Market Compass
          </Title>
          <Badge variant="dot" color={badge.color} size="sm">
            {badge.label}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed">
          Live buy pressure radar: the needle points to the coin with the strongest aggressive buying.
        </Text>
      </Stack>
      {timeframeControl}
    </Group>
  );

  const dial = view ? (
    <CompassDial maxSize={DIAL_MAX} ring={view.ring} leader={view.leader} needleAngle={view.needleAngle} timeframeLabel={tfLabel} onSelect={setSelectedId} />
  ) : (
    <CompassLoader maxSize={DIAL_MAX} />
  );

  const errorAlert = error && !view && (
    <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />}>
      {error} Retrying automatically.
    </Alert>
  );

  return (
    <section ref={sectionRef} aria-labelledby="market-compass-title">
      <Paper withBorder p={{ base: "md", sm: "xl" }} className={classes.heroCard}>
        <Stack gap="lg">
          {header}
          {errorAlert}
          <Grid gap={{ base: "lg", md: 40 }} align="center">
            <GridCol span={{ base: 12, md: 7 }}>{dial}</GridCol>
            <GridCol span={{ base: 12, md: 5 }}>
              {view ? (
                <Stack gap="lg">
                  <Leader reading={view.leader} timeframeLabel={tfLabel} onSelect={setSelectedId} />
                  <Runners readings={view.readings} leaderId={view.leader?.id ?? null} onSelect={setSelectedId} />
                </Stack>
              ) : (
                <Stack gap="sm">
                  <Skeleton height={120} radius="md" />
                  {Array.from({ length: RUNNER_COUNT }, (_, i) => (
                    <Skeleton key={i} height={40} radius="md" />
                  ))}
                </Stack>
              )}
              <Text size="xs" c="dimmed" mt="md">
                Tap any coin for live cross-exchange flow, funding and liquidations.
              </Text>
            </GridCol>
          </Grid>
        </Stack>
      </Paper>

      <CompassDetailModal reading={selected} timeframeLabel={tfLabel} opened={selected !== null} onClose={() => setSelectedId(null)} />
    </section>
  );
}
