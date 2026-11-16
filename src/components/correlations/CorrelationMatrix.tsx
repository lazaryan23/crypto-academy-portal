"use client";

import { useState } from "react";
import { Box, Group, SegmentedControl, Stack, Text, Tooltip } from "@mantine/core";
import { describeCorrelation } from "@/lib/correlation-math";
import { CORRELATION_WINDOWS, type CorrelationSnapshot, type CorrelationWindow } from "@/lib/correlations-config";

function cellColor(r: number | null) {
  if (r === null) return "transparent";
  const abs = Math.abs(r);
  if (abs < 0.2) return "rgba(134, 142, 150, 0.12)";
  const alpha = 0.15 + Math.min(1, (abs - 0.2) / 0.8) * 0.55;
  return r > 0 ? `rgba(18, 184, 134, ${alpha.toFixed(3)})` : `rgba(250, 82, 82, ${alpha.toFixed(3)})`;
}

function explain(a: string, b: string, r: number | null, window: number) {
  if (r === null) return `Not enough overlapping trading days to compare ${a} and ${b}.`;
  const { label } = describeCorrelation(r);
  const tail =
    Math.abs(r) < 0.2
      ? `Their daily moves have been largely independent.`
      : r > 0
        ? `On days ${a} rose, ${b} tended to rise too.`
        : `On days ${a} rose, ${b} tended to fall.`;
  return `${a} vs ${b}, last ${window} trading days: ${r.toFixed(2)} (${label.toLowerCase()}). ${tail}`;
}

function Legend() {
  return (
    <Group gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed">
        −1
      </Text>
      <Box
        w={180}
        h={8}
        style={{
          borderRadius: 4,
          background: `linear-gradient(90deg, ${cellColor(-1)}, ${cellColor(-0.4)}, ${cellColor(0)}, ${cellColor(0.4)}, ${cellColor(1)})`,
        }}
      />
      <Text size="xs" c="dimmed">
        +1
      </Text>
    </Group>
  );
}

export function CorrelationMatrix({ snapshot }: { snapshot: CorrelationSnapshot }) {
  const [window, setWindow] = useState<CorrelationWindow>(90);
  const matrix = snapshot.matrices[window];
  const assets = snapshot.assets;
  const columns = `minmax(76px, 0.9fr) repeat(${assets.length}, minmax(64px, 1fr))`;

  return (
    <Stack gap="md">
      <Group justify="space-between" gap="sm">
        <SegmentedControl
          value={String(window)}
          onChange={(value) => setWindow(Number(value) as CorrelationWindow)}
          data={CORRELATION_WINDOWS.map((w) => ({ value: String(w), label: `${w} days` }))}
          aria-label="Correlation window"
        />
        <Legend />
      </Group>

      <Box style={{ overflowX: "auto" }}>
        <Box miw={620} style={{ display: "grid", gridTemplateColumns: columns, gap: 4 }} role="table" aria-label={`${window}-day correlation matrix`}>
          <div role="columnheader" />
          {assets.map((asset) => (
            <Text key={asset.key} size="xs" fw={700} ta="center" c={asset.group === "crypto" ? "brand" : "dimmed"} role="columnheader" py={4}>
              {asset.label}
            </Text>
          ))}
          {assets.map((row, i) => (
            <Box key={row.key} style={{ display: "contents" }} role="row">
              <Text size="sm" fw={700} c={row.group === "crypto" ? "brand" : undefined} role="rowheader" style={{ alignSelf: "center" }}>
                {row.label}
              </Text>
              {assets.map((col, j) => {
                const r = matrix[i][j];
                const diagonal = i === j;
                return (
                  <Tooltip
                    key={col.key}
                    label={explain(row.name, col.name, r, snapshot.observations[window])}
                    multiline
                    w={260}
                    withArrow
                    disabled={diagonal}
                    openDelay={80}
                  >
                    <Box
                      role="cell"
                      tabIndex={diagonal ? -1 : 0}
                      py={10}
                      ta="center"
                      style={{
                        background: diagonal ? "var(--mantine-color-default)" : cellColor(r),
                        borderRadius: 6,
                        fontFamily: "var(--font-mono), ui-monospace, monospace",
                        fontSize: 13,
                        fontWeight: 700,
                        color: diagonal ? "var(--mantine-color-dimmed)" : undefined,
                        cursor: diagonal ? "default" : "help",
                      }}
                    >
                      {r === null ? "—" : diagonal ? "1" : r.toFixed(2)}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>

      <Text size="xs" c="dimmed">
        Pearson correlation of daily log returns over the last {snapshot.observations[window]} days when all markets traded, up to {snapshot.lastDate}. +1 means
        they move in lockstep, −1 means they move in opposite directions, and values near 0 mean no consistent relationship. Grey cells are below ±0.2.
      </Text>
    </Stack>
  );
}
