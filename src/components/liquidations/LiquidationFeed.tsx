"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Badge,
  Group,
  ScrollArea,
  SegmentedControl,
  Select,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
} from "@mantine/core";
import { IconFlame } from "@tabler/icons-react";
import type { LiquidationEvent } from "@/lib/liquidation-feed";
import { formatCompactUsd, formatPrice } from "@/lib/format";

const MIN_SIZES = [
  { value: "0", label: "All" },
  { value: "10000", label: "$10K+" },
  { value: "100000", label: "$100K+" },
];

const BIG = 100_000;

function subscribeToNothing() {
  return () => undefined;
}

function ClockTime({ time }: { time: number }) {
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const date = new Date(time);
  const text = hydrated
    ? date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : `${date.toISOString().slice(11, 19)} UTC`;
  return <time dateTime={date.toISOString()}>{text}</time>;
}

export function LiquidationFeed({ events, coins }: { events: LiquidationEvent[]; coins: string[] }) {
  const [minSize, setMinSize] = useState("0");
  const [coin, setCoin] = useState<string | null>(null);

  const visible = useMemo(() => {
    const min = Number(minSize);
    return events.filter((item) => item.usd >= min && (!coin || item.base === coin)).slice(0, 80);
  }, [events, minSize, coin]);

  return (
    <>
      <Group justify="space-between" gap="sm" mb="sm">
        <Select
          placeholder="All coins"
          data={coins}
          value={coin}
          onChange={setCoin}
          clearable
          searchable
          w={{ base: "100%", xs: 180 }}
          aria-label="Filter by coin"
        />
        <SegmentedControl size="xs" value={minSize} onChange={setMinSize} data={MIN_SIZES} aria-label="Minimum liquidation size" />
      </Group>
      <ScrollArea h={460} type="auto" offsetScrollbars>
        <Table verticalSpacing={6} horizontalSpacing={8} fz="sm" stickyHeader>
          <TableThead>
            <TableTr>
              {["Time", "Exchange", "Coin", "Side", "Price", "Value"].map((label, i) => (
                <TableTh key={label} ta={i >= 4 ? "right" : undefined} visibleFrom={label === "Exchange" ? "xs" : label === "Price" ? "sm" : undefined}>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                    {label}
                  </Text>
                </TableTh>
              ))}
            </TableTr>
          </TableThead>
          <TableTbody>
            {visible.map((item) => {
              const big = item.usd >= BIG;
              return (
                <TableTr key={item.id} bg={big ? (item.side === "long" ? "var(--mantine-color-red-light)" : "var(--mantine-color-teal-light)") : undefined}>
                  <TableTd ff="monospace" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                    <ClockTime time={item.time} />
                  </TableTd>
                  <TableTd visibleFrom="xs">{item.exchange}</TableTd>
                  <TableTd fw={600}>{item.base}</TableTd>
                  <TableTd>
                    <Badge size="sm" variant="light" color={item.side === "long" ? "red" : "teal"} miw="max-content">
                      {item.side === "long" ? "Long" : "Short"}
                    </Badge>
                  </TableTd>
                  <TableTd ta="right" ff="monospace" visibleFrom="sm" style={{ whiteSpace: "nowrap" }}>
                    {formatPrice(item.price)}
                  </TableTd>
                  <TableTd ta="right" ff="monospace" fw={big ? 700 : 500} style={{ whiteSpace: "nowrap" }}>
                    {big && <IconFlame size={14} style={{ verticalAlign: "-2px", marginRight: 2 }} color="var(--mantine-color-orange-6)" />}
                    {formatCompactUsd(item.usd)}
                  </TableTd>
                </TableTr>
              );
            })}
          </TableTbody>
        </Table>
        {!visible.length && (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            Waiting for liquidations{coin ? ` on ${coin}` : ""}
            {minSize !== "0" ? ` above ${formatCompactUsd(Number(minSize))}` : ""}…
          </Text>
        )}
      </ScrollArea>
    </>
  );
}
