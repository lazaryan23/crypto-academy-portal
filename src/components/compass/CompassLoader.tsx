"use client";

import { useEffect, useId, useState } from "react";
import { RING_SIZE } from "./useCompassFeed";
import classes from "./CompassLoader.module.css";

const CENTER = 200;
const ORBIT = 138;
const STEP_MS = 1600;

const steps = [
  "Connecting to futures markets",
  "Loading 4 hours of minute flow",
  "Measuring aggressive buys vs sells",
  "Ranking coins by buy pressure",
];

function polar(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(rad), y: CENTER - radius * Math.cos(rad) };
}

const slots = Array.from({ length: RING_SIZE }, (_, i) => polar((360 / RING_SIZE) * i, ORBIT));
const ticks = Array.from({ length: 60 }, (_, i) => i * 6);
const sweepEdge = polar(-60, 197);

export function CompassLoader({ maxSize }: { maxSize: number }) {
  const uid = useId().replace(/:/g, "");
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), STEP_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={classes.root} style={{ width: `min(100%, ${maxSize}px)` }} role="status" aria-live="polite">
      <svg className={classes.svg} viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-sweep`} x1="1" y1="0" x2="0" y2="0.6">
            <stop offset="0" stopColor="var(--mantine-color-brand-filled)" stopOpacity="0.45" />
            <stop offset="1" stopColor="var(--mantine-color-brand-filled)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle className={classes.face} cx={CENTER} cy={CENTER} r={197} />
        <circle className={classes.ring} cx={CENTER} cy={CENTER} r={ORBIT} />
        <circle className={classes.ringFaint} cx={CENTER} cy={CENTER} r={92} />
        {ticks.map((angle) => {
          const a = polar(angle, angle % 36 === 0 ? 183 : 190);
          const b = polar(angle, 195);
          return <line key={angle} className={angle % 36 === 0 ? classes.tickMajor : classes.tick} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        <g className={classes.sweep}>
          <path d={`M${CENTER} ${CENTER} L${CENTER} 3 A197 197 0 0 0 ${sweepEdge.x} ${sweepEdge.y} Z`} fill={`url(#${uid}-sweep)`} />
          <line className={classes.sweepLine} x1={CENTER} y1={CENTER} x2={CENTER} y2={3} />
        </g>
        {slots.map((p, i) => (
          <g key={i} className={classes.slot} style={{ animationDelay: `${(i / RING_SIZE) * 2.4}s` }}>
            <circle className={classes.slotPing} cx={p.x} cy={p.y} r={21} />
            <circle className={classes.slotDot} cx={p.x} cy={p.y} r={21} />
          </g>
        ))}
      </svg>
      <div className={classes.hub}>
        <div className={classes.hubInner}>
          <span className={classes.hubTitle}>Scanning</span>
          <span key={step} className={classes.hubStep}>
            {steps[step]}
          </span>
          <span className={classes.dots} aria-hidden="true">
            {steps.map((_, i) => (
              <span key={i} data-active={i <= step} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
