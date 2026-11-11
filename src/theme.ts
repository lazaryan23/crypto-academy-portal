import { createTheme, type MantineColorsTuple } from "@mantine/core";

const brand: MantineColorsTuple = [
  "#e3fbff",
  "#c4f3fd",
  "#91e7f8",
  "#5cdaf3",
  "#34cfee",
  "#1cc8ec",
  "#06b6d4",
  "#0094ad",
  "#00839a",
  "#006f83",
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 7, dark: 6 },
  colors: { brand },
  fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
  fontFamilyMonospace: "var(--font-mono), ui-monospace, monospace",
  headings: { fontFamily: "var(--font-inter), system-ui, sans-serif", fontWeight: "700" },
  defaultRadius: "md",
  defaultGradient: { from: "cyan", to: "violet", deg: 120 },
  cursorType: "pointer",
  components: {
    Card: { defaultProps: { withBorder: true, radius: "lg" } },
    Paper: { defaultProps: { radius: "lg" } },
  },
});
