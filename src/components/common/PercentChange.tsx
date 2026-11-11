import { Group, Text, type TextProps } from "@mantine/core";
import { IconTriangleFilled, IconTriangleInvertedFilled } from "@tabler/icons-react";
import { changeColor, formatPercent } from "@/lib/format";

export function PercentChange({ value, ...props }: { value: number | null | undefined } & TextProps) {
  const color = changeColor(value);
  return (
    <Group gap={4} wrap="nowrap" justify="flex-end" component="span">
      {value != null && value !== 0 &&
        (value > 0 ? (
          <IconTriangleFilled size={9} color={`var(--mantine-color-${color}-6)`} />
        ) : (
          <IconTriangleInvertedFilled size={9} color={`var(--mantine-color-${color}-6)`} />
        ))}
      <Text component="span" c={color} fw={600} ff="monospace" size="sm" {...props}>
        {formatPercent(value)}
      </Text>
    </Group>
  );
}
