"use client";

import { useState } from "react";
import { Box, Group, Text } from "@mantine/core";
import type { EtfFlowDay } from "@/lib/etf-flows-config";
import { formatCompactUsd } from "@/lib/format";

const W = 1000;
const H = 240;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

function signedUsd(value: number) {
  return `${value >= 0 ? "+" : "−"}${formatCompactUsd(Math.abs(value))}`;
}

export function EtfFlowChart({ days }: { days: EtfFlowDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((day) => Math.abs(day.netFlowUsd)));
  const plot = H - PAD_TOP - PAD_BOTTOM;
  const zero = PAD_TOP + plot / 2;
  const slot = W / days.length;
  const barWidth = Math.max(4, slot * 0.68);
  const active = hover !== null ? days[hover] : days[days.length - 1];

  return (
    <Box>
      <Group justify="space-between" mb={6}>
        <Text size="sm" c="dimmed">
          {hover !== null ? active.date : `Latest · ${active.date}`}
        </Text>
        <Text size="sm" fw={700} ff="monospace" c={active.netFlowUsd >= 0 ? "teal" : "red"}>
          {signedUsd(active.netFlowUsd)}
        </Text>
      </Group>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Daily net ETF flows, last 30 trading days" onMouseLeave={() => setHover(null)}>
        <line x1={0} x2={W} y1={zero} y2={zero} stroke="var(--mantine-color-default-border)" />
        {days.map((day, i) => {
          const h = (Math.abs(day.netFlowUsd) / max) * (plot / 2);
          const x = i * slot + (slot - barWidth) / 2;
          const y = day.netFlowUsd >= 0 ? zero - h : zero;
          return (
            <g key={day.date} onMouseEnter={() => setHover(i)}>
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(1, h)}
                rx={2}
                fill={`var(--mantine-color-${day.netFlowUsd >= 0 ? "teal" : "red"}-6)`}
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
            </g>
          );
        })}
        {[0, Math.floor(days.length / 2), days.length - 1].map((i) => (
          <text key={i} x={i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--mantine-color-dimmed)">
            {days[i]?.date.slice(5)}
          </text>
        ))}
      </svg>
    </Box>
  );
}
