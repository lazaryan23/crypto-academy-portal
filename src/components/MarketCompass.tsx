"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Group,
  Paper,
  Popover,
  PopoverDropdown,
  PopoverTarget,
  SimpleGrid,
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
import { CompassDial } from "./compass/CompassDial";
import { CompassDetailModal } from "./compass/CompassDetailModal";
import { useCompassFeed, type CompassStatus } from "./compass/useCompassFeed";
import classes from "./MarketCompass.module.css";

const OFFSCREEN_GRACE_MS = 15_000;
const DIAL_MAX = 400;
const RUNNER_COUNT = 3;

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

function Runners({ readings, leaderId, onSelect }: { readings: PressureReading[]; leaderId: string | null; onSelect: (id: string) => void }) {
  const runners = readings.filter((r) => r.id !== leaderId).slice(0, RUNNER_COUNT);
  return (
    <SimpleGrid cols={RUNNER_COUNT} spacing="xs">
      {runners.map((reading, i) => (
        <UnstyledButton
          key={reading.id}
          onClick={() => onSelect(reading.id)}
          p="xs"
          aria-label={`${reading.name} buy pressure details`}
          style={{ borderRadius: "var(--mantine-radius-md)", border: "1px solid var(--hairline)", minWidth: 0 }}
        >
          <Group gap={6} wrap="nowrap">
            <Text size="xs" c="dimmed">
              {i + 2}
            </Text>
            <Avatar src={reading.image || null} name={reading.symbol} color="initials" alt="" size={20} />
            <Text size="sm" fw={700} truncate style={{ flex: 1, minWidth: 0 }}>
              {reading.symbol}
            </Text>
            <Text size="xs" fw={700} ff="monospace" c={describeIndex(reading.index).color}>
              {Math.round(reading.index)}
            </Text>
          </Group>
        </UnstyledButton>
      ))}
    </SimpleGrid>
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
    <Skeleton circle mx="auto" style={{ width: `min(100%, ${DIAL_MAX}px)`, height: "auto", aspectRatio: "1" }} />
  );

  const errorAlert = error && !view && (
    <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />}>
      {error} Retrying automatically.
    </Alert>
  );

  return (
    <section ref={sectionRef} aria-labelledby="market-compass-title">
      <Paper withBorder p={{ base: "md", sm: "lg" }} className={classes.heroCard}>
        <Stack gap="md">
          {header}
          {errorAlert}
          {dial}
          {view ? (
            <Runners readings={view.readings} leaderId={view.leader?.id ?? null} onSelect={setSelectedId} />
          ) : (
            <SimpleGrid cols={RUNNER_COUNT} spacing="xs">
              {Array.from({ length: RUNNER_COUNT }, (_, i) => (
                <Skeleton key={i} height={38} radius="md" />
              ))}
            </SimpleGrid>
          )}
          <Text size="xs" c="dimmed" ta="center">
            Tap any coin for live cross-exchange flow, funding and liquidations.
          </Text>
        </Stack>
      </Paper>

      <CompassDetailModal reading={selected} timeframeLabel={tfLabel} opened={selected !== null} onClose={() => setSelectedId(null)} />
    </section>
  );
}
