import { fearGreedColor } from "@/lib/fear-greed";

const CX = 100;
const CY = 100;
const R = 80;

const bands = [
  { from: 0, to: 25, color: "red" },
  { from: 25, to: 45, color: "orange" },
  { from: 45, to: 55, color: "yellow" },
  { from: 55, to: 75, color: "lime" },
  { from: 75, to: 100, color: "teal" },
];

function point(value: number, radius: number) {
  const angle = Math.PI * (1 - value / 100);
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

function arc(from: number, to: number) {
  const a = point(from, R);
  const b = point(to, R);
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} A${R} ${R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function FearGreedGauge({ value, label }: { value: number; label: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  const tip = point(clamped, R - 18);
  const color = `var(--mantine-color-${fearGreedColor(clamped)}-6)`;
  return (
    <svg
      viewBox="0 0 200 122"
      width="100%"
      style={{ maxWidth: 260, display: "block", marginInline: "auto" }}
      role="img"
      aria-label={`Fear and Greed Index ${value}, ${label}`}
    >
      {bands.map((band) => (
        <path
          key={band.from}
          d={arc(band.from + 0.8, band.to - 0.8)}
          fill="none"
          stroke={`var(--mantine-color-${band.color}-6)`}
          strokeOpacity={clamped >= band.from && clamped <= band.to ? 1 : 0.28}
          strokeWidth={14}
          strokeLinecap="butt"
        />
      ))}
      <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke="var(--mantine-color-text)" strokeWidth={3} strokeLinecap="round" />
      <circle cx={CX} cy={CY} r={6} fill="var(--mantine-color-text)" />
      <text
        x={CX}
        y={CY - 26}
        textAnchor="middle"
        fontSize="28"
        fontWeight="800"
        fill={color}
        fontFamily="var(--font-mono), ui-monospace, monospace"
      >
        {value}
      </text>
      <text x={CX} y={CY + 20} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
        {label.toUpperCase()}
      </text>
    </svg>
  );
}
