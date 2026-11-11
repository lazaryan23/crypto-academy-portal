import {
  Alert,
  List,
  ListItem,
  Stack,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  Timeline,
  TimelineItem,
  Title,
} from "@mantine/core";
import { IconAlertTriangle, IconBulb, IconInfoCircle } from "@tabler/icons-react";
import type { GuideBlock, GuideWidget, Guide } from "@/content/academy";
import { PromoCallout } from "@/components/common/PromoCallout";
import { PositionDiagram } from "./PositionDiagram";
import { LeverageCalculator } from "./LeverageCalculator";
import { PositionSizeCalculator } from "./PositionSizeCalculator";

const tones = {
  tip: { color: "teal", icon: IconBulb },
  warning: { color: "orange", icon: IconAlertTriangle },
  info: { color: "blue", icon: IconInfoCircle },
};

function Widget({ widget }: { widget: GuideWidget }) {
  switch (widget) {
    case "position-diagram":
      return <PositionDiagram />;
    case "leverage-calculator":
      return <LeverageCalculator />;
    case "position-size-calculator":
      return <PositionSizeCalculator />;
    case "promo":
      return <PromoCallout compact />;
  }
}

function Block({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <Text size="md" lh={1.75}>
          {block.text}
        </Text>
      );
    case "list":
      return (
        <List type={block.ordered ? "ordered" : "unordered"} spacing="xs" size="md" withPadding>
          {block.items.map((item) => (
            <ListItem key={item}>{item}</ListItem>
          ))}
        </List>
      );
    case "callout": {
      const tone = tones[block.tone];
      return (
        <Alert color={tone.color} variant="light" title={block.title} icon={<tone.icon size={18} />} radius="lg">
          {block.text}
        </Alert>
      );
    }
    case "table":
      return (
        <TableScrollContainer minWidth={480}>
          <Table withTableBorder withColumnBorders striped verticalSpacing="sm">
            <TableThead>
              <TableTr>
                {block.headers.map((h, i) => (
                  <TableTh key={i}>{h}</TableTh>
                ))}
              </TableTr>
            </TableThead>
            <TableTbody>
              {block.rows.map((row, i) => (
                <TableTr key={i}>
                  {row.map((cell, j) => (
                    <TableTd key={j} fw={j === 0 ? 600 : undefined}>
                      {cell}
                    </TableTd>
                  ))}
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        </TableScrollContainer>
      );
    case "steps":
      return (
        <Timeline active={block.items.length} bulletSize={28} lineWidth={2}>
          {block.items.map((step, i) => (
            <TimelineItem
              key={step.title}
              bullet={
                <Text size="xs" fw={700}>
                  {i + 1}
                </Text>
              }
              title={<Text fw={700}>{step.title}</Text>}
            >
              <Text size="sm" c="dimmed" mt={4}>
                {step.text}
              </Text>
            </TimelineItem>
          ))}
        </Timeline>
      );
    case "widget":
      return <Widget widget={block.widget} />;
  }
}

export function GuideContent({ guide }: { guide: Guide }) {
  return (
    <Stack gap={40}>
      {guide.sections.map((section) => (
        <Stack key={section.id} gap="md" component="section" id={section.id} style={{ scrollMarginTop: 84 }}>
          <Title order={2} size="h3">
            {section.heading}
          </Title>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
