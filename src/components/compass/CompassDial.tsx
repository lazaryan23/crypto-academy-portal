"use client";

import { useId, type KeyboardEvent } from "react";
import { Avatar, Stack, Text } from "@mantine/core";
import { formatCompactUsd } from "@/lib/format";
import type { PressureReading } from "@/lib/buy-pressure";
import { RING_SIZE, type RingSlot } from "./useCompassFeed";
import classes from "./CompassDial.module.css";

const CENTER = 200;
const ORBIT = 138;
const COIN_RADIUS = 21;
const LABEL_RADIUS = 177;

function polar(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(rad), y: CENTER - radius * Math.cos(rad) };
}

function slotColor(index: number) {
  if (index >= 58) return "var(--mantine-color-teal-6)";
  if (index <= 42) return "var(--mantine-color-red-6)";
  return "var(--mantine-color-gray-6)";
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : "−"}${formatCompactUsd(Math.abs(value))}`;
}

const ticks = Array.from({ length: 60 }, (_, i) => i * 6).filter((angle) => {
  const offset = angle % (360 / RING_SIZE);
  return offset > 8 && offset < 360 / RING_SIZE - 8;
});
const dividers = Array.from({ length: RING_SIZE }, (_, i) => (360 / RING_SIZE) * i + 180 / RING_SIZE);

export function CompassDial({
  ring,
  leader,
  needleAngle,
  timeframeLabel,
  onSelect,
}: {
  ring: RingSlot[];
  leader: PressureReading | null;
  needleAngle: number;
  timeframeLabel: string;
  onSelect: (id: string) => void;
}) {
  const uid = useId().replace(/:/g, "");

  const onKey = (event: KeyboardEvent, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  };

  return (
    <div className={classes.root}>
      <svg className={classes.svg} viewBox="0 0 400 400" role="group" aria-label="Market Compass dial">
        <defs>
          <clipPath id={`${uid}-coin`} clipPathUnits="objectBoundingBox">
            <circle cx="0.5" cy="0.5" r="0.5" />
          </clipPath>
        </defs>
        <circle className={classes.face} cx={CENTER} cy={CENTER} r={197} />
        <circle className={classes.innerRing} cx={CENTER} cy={CENTER} r={ORBIT} />
        {ticks.map((angle) => {
          const a = polar(angle, 190);
          const b = polar(angle, 195);
          return <line key={angle} className={classes.tick} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        {dividers.map((angle) => {
          const a = polar(angle, 183);
          const b = polar(angle, 195);
          return <line key={angle} className={classes.tickMajor} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}

        <g className={classes.needle} style={{ transform: `rotate(${needleAngle}deg)` }} aria-hidden="true">
          <polygon className={classes.needleTip} points={`${CENTER},${CENTER - 114} ${CENTER + 9},${CENTER} ${CENTER - 9},${CENTER}`} />
          <polygon className={classes.needleTail} points={`${CENTER - 9},${CENTER} ${CENTER + 9},${CENTER} ${CENTER},${CENTER + 96}`} />
        </g>

        {ring.map(({ slot, angle, reading }) => {
          const pos = polar(angle, ORBIT);
          const label = polar(angle, LABEL_RADIUS);
          const isLeader = leader?.id === reading.id;
          const strength = Math.min(1, 0.35 + Math.abs(reading.index - 50) / 40);
          return (
            <g
              key={slot}
              className={classes.slot}
              data-leader={isLeader}
              role="button"
              tabIndex={0}
              aria-label={`${reading.name}: buy pressure ${Math.round(reading.index)} of 100, net ${formatSigned(reading.netUsd)}`}
              onClick={() => onSelect(reading.id)}
              onKeyDown={(event) => onKey(event, reading.id)}
            >
              <circle className={classes.halo} cx={pos.x} cy={pos.y} r={COIN_RADIUS + 5} />
              <circle
                className={classes.slotRing}
                cx={pos.x}
                cy={pos.y}
                r={COIN_RADIUS}
                style={{ stroke: slotColor(reading.index), strokeOpacity: strength }}
              />
              {reading.image ? (
                <image
                  href={reading.image}
                  x={pos.x - COIN_RADIUS + 4}
                  y={pos.y - COIN_RADIUS + 4}
                  width={(COIN_RADIUS - 4) * 2}
                  height={(COIN_RADIUS - 4) * 2}
                  clipPath={`url(#${uid}-coin)`}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <text className={classes.slotLabel} x={pos.x} y={pos.y + 4}>
                  {reading.symbol.slice(0, 4)}
                </text>
              )}
              <text className={classes.slotLabel} x={label.x} y={label.y - 1}>
                {reading.symbol}
              </text>
              <text className={classes.slotScore} x={label.x} y={label.y + 10}>
                {Math.round(reading.index)}
              </text>
              <title>{`${reading.name} · BPI ${Math.round(reading.index)}`}</title>
            </g>
          );
        })}
      </svg>

      <button
        type="button"
        className={classes.hub}
        disabled={!leader}
        onClick={() => leader && onSelect(leader.id)}
        aria-label={leader ? `Open ${leader.name} buy pressure details` : "No coin with net buying right now"}
      >
        {leader ? (
          <Stack gap={2} align="center">
            <Avatar src={leader.image || null} name={leader.symbol} color="initials" alt="" size="sm" />
            <span className={classes.hubSymbol}>{leader.symbol}</span>
            <span className={classes.hubIndex}>BPI {Math.round(leader.index)}</span>
            <span className={classes.hubMeta}>
              {formatSigned(leader.netUsd)} net · {timeframeLabel}
              <br />
              {leader.spike !== null ? `Vol ×${leader.spike.toFixed(1)} vs avg` : ""}
            </span>
          </Stack>
        ) : (
          <Text size="xs" c="dimmed" px="xs">
            No coin with net buying right now
          </Text>
        )}
      </button>
    </div>
  );
}
