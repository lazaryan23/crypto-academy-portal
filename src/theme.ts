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

const dark: MantineColorsTuple = [
  "#cfd7de",
  "#aeb8c2",
  "#8d99a6",
  "#62707e",
  "#3a4551",
  "#2c3540",
  "#222a33",
  "#181e25",
  "#12171d",
  "#0c1014",
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 7, dark: 6 },
  colors: { brand, dark },
  fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif",
  fontFamilyMonospace: "var(--font-mono), ui-monospace, monospace",
  headings: { fontFamily: "var(--font-display), ui-sans-serif, system-ui, sans-serif", fontWeight: "700" },
  defaultRadius: "md",
  cursorType: "pointer",
  components: {
    Card: { defaultProps: { withBorder: true, radius: "lg" } },
    Paper: { defaultProps: { radius: "lg" } },
  },
});
