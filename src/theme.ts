import { createTheme, type MantineColorsTuple } from "@mantine/core";

const brand: MantineColorsTuple = [
  "#e6fcf5",
  "#c3fae8",
  "#96f2d7",
  "#63e6be",
  "#38d9a9",
  "#20c997",
  "#12b886",
  "#0ca678",
  "#099268",
  "#087f5b",
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 7, dark: 6 },
  colors: { brand },
  fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
  fontFamilyMonospace: "var(--font-mono), ui-monospace, monospace",
  headings: { fontFamily: "var(--font-inter), system-ui, sans-serif", fontWeight: "700" },
  defaultRadius: "md",
  cursorType: "pointer",
  components: {
    Card: { defaultProps: { withBorder: true, radius: "lg" } },
    Paper: { defaultProps: { radius: "lg" } },
  },
});
