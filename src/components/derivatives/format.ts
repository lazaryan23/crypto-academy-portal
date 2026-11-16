export function formatFundingRate(rate: number | null, digits = 4) {
  if (rate === null || !Number.isFinite(rate)) return "—";
  const pct = rate * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(digits)}%`;
}

export function formatApr(apr: number | null) {
  if (apr === null || !Number.isFinite(apr)) return "—";
  const digits = Math.abs(apr) >= 100 ? 0 : 1;
  return `${apr > 0 ? "+" : ""}${apr.toFixed(digits)}%`;
}

export function fundingTint(apr: number | null) {
  if (apr === null || !Number.isFinite(apr) || apr === 0) return undefined;
  const alpha = Math.min(Math.abs(apr) / 40, 1) * 0.32 + 0.04;
  return apr > 0 ? `rgba(18, 184, 134, ${alpha.toFixed(3)})` : `rgba(250, 82, 82, ${alpha.toFixed(3)})`;
}

export function fundingColor(value: number | null) {
  if (value === null || value === 0) return "dimmed";
  return value > 0 ? "teal" : "red";
}

export function utcTime(timestamp: number | null) {
  if (!timestamp) return null;
  return `${new Date(timestamp).toISOString().slice(11, 16)} UTC`;
}

export const BASELINE_APR = 10.95;

export function fundingHeat(apr: number | null) {
  if (apr === null || !Number.isFinite(apr)) return undefined;
  if (apr < 0) {
    const alpha = Math.min(Math.abs(apr) / 30, 1) * 0.5 + 0.12;
    return `hsla(152, 70%, 42%, ${alpha.toFixed(3)})`;
  }
  if (apr <= BASELINE_APR + 1) return "hsla(210, 10%, 50%, 0.10)";
  const heat = Math.min((apr - BASELINE_APR) / 50, 1);
  const hue = 48 - heat * 48;
  const alpha = 0.18 + heat * 0.45;
  return `hsla(${hue.toFixed(0)}, 90%, 52%, ${alpha.toFixed(3)})`;
}
