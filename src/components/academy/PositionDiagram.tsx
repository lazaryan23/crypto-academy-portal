"use client";

import { useState } from "react";
import { Group, Paper, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";

type Side = "long" | "short";

const W = 640;
const H = 300;

const config: Record<Side, { path: number[]; entry: number; tp: number; sl: number; text: string }> = {
  long: {
    path: [190, 200, 178, 186, 165, 172, 150, 158, 120, 128, 96, 80, 70],
    entry: 186,
    tp: 80,
    sl: 236,
    text: "You buy at the entry. If the price rises to the take-profit you close in profit; if it falls to the stop-loss you exit with a small, planned loss.",
  },
  short: {
    path: [110, 100, 122, 114, 136, 128, 152, 144, 178, 170, 206, 220, 232],
    entry: 114,
    tp: 220,
    sl: 66,
    text: "You sell at the entry. If the price falls to the take-profit you buy back cheaper in profit; if it rises to the stop-loss you exit with a small, planned loss.",
  },
};

function Level({ y, label, color }: { y: number; label: string; color: string }) {
  return (
    <g>
      <line x1={40} x2={W - 110} y1={y} y2={y} stroke={color} strokeDasharray="6 5" strokeWidth={1.5} />
      <rect x={W - 104} y={y - 12} width={96} height={24} rx={6} fill={color} opacity={0.15} />
      <text x={W - 56} y={y + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill={color}>
        {label}
      </text>
    </g>
  );
}

export function PositionDiagram() {
  const [side, setSide] = useState<Side>("long");
  const c = config[side];
  const step = (W - 150) / (c.path.length - 1);
  const d = c.path.map((y, i) => `${i === 0 ? "M" : "L"}${40 + i * step},${y}`).join(" ");
  const entryX = 40 + 3 * step;
  const profitColor = "var(--mantine-color-teal-6)";
  const lossColor = "var(--mantine-color-red-6)";
  const entryColor = "var(--mantine-color-blue-5)";
  const profitTop = Math.min(c.entry, c.tp);
  const lossTop = Math.min(c.entry, c.sl);

  return (
    <Paper withBorder p="md" my="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={700}>{side === "long" ? "Long position" : "Short position"} — price over time</Text>
          <SegmentedControl
            size="xs"
            value={side}
            onChange={(v) => setSide(v as Side)}
            data={[
              { value: "long", label: "Long ↑" },
              { value: "short", label: "Short ↓" },
            ]}
          />
        </Group>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${side} position diagram with entry, take-profit and stop-loss levels`}>
          <rect x={entryX} y={profitTop} width={W - 110 - entryX} height={Math.abs(c.entry - c.tp)} fill={profitColor} opacity={0.08} />
          <rect x={entryX} y={lossTop} width={W - 110 - entryX} height={Math.abs(c.entry - c.sl)} fill={lossColor} opacity={0.08} />
          <Level y={c.tp} label="Take-profit" color={profitColor} />
          <Level y={c.entry} label="Entry" color={entryColor} />
          <Level y={c.sl} label="Stop-loss" color={lossColor} />
          <path d={d} fill="none" stroke="var(--mantine-color-text)" strokeWidth={2.5} strokeLinejoin="round" />
          <circle cx={entryX} cy={c.entry} r={6} fill={entryColor} />
          <text x={entryX + 10} y={c.entry + (side === "long" ? 22 : -12)} fontSize={12} fill={entryColor} fontWeight={700}>
            {side === "long" ? "Buy / Long" : "Sell / Short"}
          </text>
          <text x={40} y={H - 8} fontSize={11} fill="var(--mantine-color-dimmed)">
            time →
          </text>
        </svg>
        <Text size="sm" c="dimmed">
          {c.text}
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          <Text size="sm">
            <Text span c="teal" fw={700}>
              Profit zone:
            </Text>{" "}
            price moves {side === "long" ? "up" : "down"} from entry
          </Text>
          <Text size="sm">
            <Text span c="red" fw={700}>
              Loss zone:
            </Text>{" "}
            price moves {side === "long" ? "down" : "up"} from entry
          </Text>
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}
