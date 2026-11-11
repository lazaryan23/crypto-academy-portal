const compactUnits: [number, string][] = [
  [1e12, "T"],
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "K"],
];

function compactValue(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  for (const [size, unit] of compactUnits) {
    if (abs >= size) return `${sign}${(abs / size).toFixed(2)}${unit}`;
  }
  return `${sign}${abs.toFixed(2)}`;
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const maximumFractionDigits = abs >= 1000 ? 2 : abs >= 1 ? 4 : abs >= 0.01 ? 6 : 8;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: abs >= 1 ? 2 : 0,
    maximumFractionDigits,
  }).format(value);
}

export function formatCompactUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const formatted = compactValue(value);
  return formatted.startsWith("-") ? `-$${formatted.slice(1)}` : `$${formatted}`;
}

export function formatSupply(value: number | null | undefined, symbol?: string): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${compactValue(value)}${symbol ? ` ${symbol.toUpperCase()}` : ""}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function changeColor(value: number | null | undefined): string {
  if (value == null || value === 0) return "dimmed";
  return value > 0 ? "teal" : "red";
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function toParagraphs(text: string, max = 6): string[] {
  return text
    .split(/\r?\n\s*\r?\n|\r\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, max);
}
