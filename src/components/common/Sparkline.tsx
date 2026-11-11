export function Sparkline({ data, width = 120, height = 36 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const step = Math.max(1, Math.floor(data.length / 60));
  const points = data.filter((_, i) => i % step === 0);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * width).toFixed(1)},${(height - ((v - min) / range) * (height - 4) - 2).toFixed(1)}`)
    .join(" ");
  const up = points[points.length - 1] >= points[0];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke={`var(--mantine-color-${up ? "teal" : "red"}-6)`} strokeWidth={1.5} />
    </svg>
  );
}
