"use client";

import { useState } from "react";
import { Alert, Group, Paper, ProgressRoot, ProgressSection, SegmentedControl, Skeleton, Stack, Text, Tooltip } from "@mantine/core";
import { IconScale } from "@tabler/icons-react";
import { LONG_SHORT_COINS, LONG_SHORT_TIMEFRAMES, type LongShortCoin, type LongShortTimeframe } from "@/lib/long-short-config";
import { useLongShort } from "./useLongShort";

const TF_LABELS: Record<LongShortTimeframe, string> = { "1h": "1H", "4h": "4H", "24h": "24H" };

function crowding(longPct: number) {
  if (longPct >= 70) return { label: "Longs heavily crowded", color: "orange" };
  if (longPct >= 58) return { label: "Long-leaning", color: "teal" };
  if (longPct > 42) return { label: "Balanced", color: "gray" };
  if (longPct > 30) return { label: "Short-leaning", color: "red" };
  return { label: "Shorts heavily crowded", color: "orange" };
}

function SplitBar({ longPct, size, label }: { longPct: number; size: "sm" | "xl"; label: string }) {
  const shortPct = 100 - longPct;
  return (
    <ProgressRoot size={size === "xl" ? 28 : 10} radius="xl" aria-label={label}>
      <ProgressSection value={longPct} color="teal">
        {size === "xl" && (
          <Text size="xs" fw={800} c="white">
            {longPct.toFixed(1)}%
          </Text>
        )}
      </ProgressSection>
      <ProgressSection value={shortPct} color="red">
        {size === "xl" && (
          <Text size="xs" fw={800} c="white">
            {shortPct.toFixed(1)}%
          </Text>
        )}
      </ProgressSection>
    </ProgressRoot>
  );
}

export function LongShortWidget() {
  const [coin, setCoin] = useState<LongShortCoin>("BTC");
  const [timeframe, setTimeframe] = useState<LongShortTimeframe>("1h");
  const state = useLongShort(coin, timeframe);

  return (
    <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md" component="section" aria-labelledby="long-short-title">
      <Stack gap="md">
        <Group justify="space-between" gap="sm">
          <Group gap="xs">
            <IconScale size={20} color="var(--mantine-color-brand-filled)" aria-hidden="true" />
            <Text fw={700} size="lg" id="long-short-title">
              Long / short ratio
            </Text>
          </Group>
          <Group gap="xs">
            <SegmentedControl size="xs" value={coin} onChange={(value) => setCoin(value as LongShortCoin)} data={[...LONG_SHORT_COINS]} aria-label="Coin" />
            <SegmentedControl
              size="xs"
              value={timeframe}
              onChange={(value) => setTimeframe(value as LongShortTimeframe)}
              data={LONG_SHORT_TIMEFRAMES.map((tf) => ({ value: tf, label: TF_LABELS[tf] }))}
              aria-label="Timeframe"
            />
          </Group>
        </Group>

        {state.status === "loading" && (
          <Stack gap="sm">
            <Skeleton h={28} radius="xl" />
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} h={34} radius="md" />
            ))}
          </Stack>
        )}

        {state.status === "error" && (
          <Alert color="gray" variant="light">
            {state.message}
          </Alert>
        )}

        {state.status === "ok" && state.data.longPct !== null && (
          <Stack gap="md">
            <Stack gap={6}>
              <Group justify="space-between">
                <Text size="sm" fw={700}>
                  All exchanges · {coin}
                </Text>
                <Text size="sm" fw={700} c={crowding(state.data.longPct).color}>
                  {crowding(state.data.longPct).label}
                </Text>
              </Group>
              <SplitBar longPct={state.data.longPct} size="xl" label={`${coin} accounts long versus short, all exchanges`} />
              <Group justify="space-between">
                <Text size="xs" c="teal" fw={700}>
                  Long
                </Text>
                <Text size="xs" c="dimmed">
                  Long/short ratio {(state.data.longPct / (100 - state.data.longPct)).toFixed(2)}
                </Text>
                <Text size="xs" c="red" fw={700}>
                  Short
                </Text>
              </Group>
            </Stack>

            <Stack gap="xs">
              {state.data.exchanges.map((e) => (
                <Group key={e.exchange} gap="sm" wrap="nowrap">
                  <Text size="sm" fw={600} w={64}>
                    {e.exchange}
                  </Text>
                  <div style={{ flex: 1 }}>
                    <SplitBar longPct={e.longPct} size="sm" label={`${e.exchange} ${coin} accounts long versus short`} />
                  </div>
                  <Tooltip label={`Average of ${e.samples} readings · latest ${e.latestLongPct.toFixed(1)}% long`} withArrow>
                    <Text size="sm" ff="monospace" w={104} ta="right" style={{ whiteSpace: "nowrap" }}>
                      <Text span c="teal" fw={700}>
                        {e.longPct.toFixed(1)}
                      </Text>
                      {" / "}
                      <Text span c="red" fw={700}>
                        {(100 - e.longPct).toFixed(1)}
                      </Text>
                    </Text>
                  </Tooltip>
                </Group>
              ))}
            </Stack>

            <Text size="xs" c="dimmed">
              Share of trader accounts holding a net long or short {coin}USDT perpetual, averaged over the last {TF_LABELS[timeframe]}. Very one-sided readings
              often precede squeezes against the crowd.
            </Text>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
