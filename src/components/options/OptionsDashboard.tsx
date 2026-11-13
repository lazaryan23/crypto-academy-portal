"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Group,
  LoadingOverlay,
  Paper,
  ProgressRoot,
  ProgressSection,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  TableScrollContainer,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  Title,
} from "@mantine/core";
import { IconChartBar, IconWaveSine } from "@tabler/icons-react";
import { RelativeTime } from "@/components/common/RelativeTime";
import { expectedDailyMove, formatStrike, mergeStrikes, OPTION_CURRENCIES, ratio, type ExpirySummary, type OptionCurrency, type OptionsOverview } from "@/lib/options-math";
import { formatCompactUsd, formatPercent, formatPrice } from "@/lib/format";
import { DvolChart } from "./DvolChart";
import { StrikeChart } from "./StrikeChart";

const ALL = "all";
const DAY_MS = 86_400_000;
const MAJOR_WINDOW_DAYS = 45;

type LoadState = { status: "ok"; data: OptionsOverview } | { status: "error" } | { status: "loading" };

function expiryDate(expiry: number) {
  return new Date(expiry).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function daysLeft(expiry: number, now: number) {
  const days = (expiry - now) / DAY_MS;
  return days < 1 ? `${Math.max(1, Math.round(days * 24))}h` : `${Math.round(days)}d`;
}

function coins(value: number, unit: string) {
  const formatted = value >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)}M` : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toFixed(0);
  return `${formatted} ${unit}`;
}

function putCallStory(pc: number | null) {
  if (pc === null) return "";
  if (pc < 0.7) return "Far more calls than puts: positioning leans bullish.";
  if (pc < 1) return "More calls than puts open: a mildly bullish lean.";
  if (pc < 1.3) return "More puts than calls: traders are paying for downside protection.";
  return "Heavy put positioning: traders are hedging hard against a drop.";
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.4} mb={6}>
        {label}
      </Text>
      {children}
    </Paper>
  );
}

function Summary({ data, now }: { data: OptionsOverview; now: number }) {
  const unit = data.currency;
  const totalOi = data.callOi + data.putOi;
  const pcOi = ratio(data.putOi, data.callOi);
  const pcVolume = ratio(data.putVolume, data.callVolume);
  const major = data.expiries.filter((e) => e.expiry - now <= MAJOR_WINDOW_DAYS * DAY_MS).sort((a, b) => b.notionalUsd - a.notionalUsd)[0];
  const daily = data.dvol ? expectedDailyMove(data.dvol.current) : null;

  return (
    <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
      <Card label="Options open interest">
        <Text fz={24} fw={700} ff="monospace">
          {formatCompactUsd(totalOi * data.indexPrice)}
        </Text>
        <Text size="xs" c="dimmed">
          {coins(totalOi, unit)} across {data.expiries.length} expiries
        </Text>
      </Card>
      <Card label="Put / call ratio">
        <Group gap="md" align="baseline">
          <Text fz={24} fw={700} ff="monospace" c={pcOi !== null && pcOi < 1 ? "teal" : "red"}>
            {pcOi === null ? "—" : pcOi.toFixed(2)}
          </Text>
          <Text size="xs" c="dimmed">
            by OI · {pcVolume === null ? "—" : pcVolume.toFixed(2)} by 24h volume
          </Text>
        </Group>
        <ProgressRoot size="sm" radius="xl" mt={6} aria-label="Calls versus puts by open interest">
          <ProgressSection value={(data.callOi / totalOi) * 100} color="teal" />
          <ProgressSection value={(data.putOi / totalOi) * 100} color="red" />
        </ProgressRoot>
        <Text size="xs" c="dimmed" mt={6}>
          {putCallStory(pcOi)}
        </Text>
      </Card>
      <Card label="Biggest upcoming expiry">
        {major ? (
          <>
            <Text fz={24} fw={700} ff="monospace">
              {formatCompactUsd(major.notionalUsd)}
            </Text>
            <Text size="xs" c="dimmed">
              {expiryDate(major.expiry)} (in {daysLeft(major.expiry, now)}) · max pain{" "}
              <Text span fw={700} c="orange">
                {major.maxPain === null ? "—" : formatStrike(major.maxPain)}
              </Text>
              {major.maxPain !== null && ` (${formatPercent(((major.maxPain - data.indexPrice) / data.indexPrice) * 100)} from spot)`}
            </Text>
          </>
        ) : (
          <Text size="sm" c="dimmed">
            No expiry in the next {MAJOR_WINDOW_DAYS} days
          </Text>
        )}
      </Card>
      <Card label={`${unit} implied volatility (DVOL)`}>
        {data.dvol ? (
          <>
            <Group gap="xs" align="baseline">
              <Text fz={24} fw={700} ff="monospace" c="grape">
                {data.dvol.current.toFixed(1)}
              </Text>
              {data.dvol.change24h !== null && (
                <Text size="xs" c={data.dvol.change24h >= 0 ? "orange" : "teal"} ff="monospace">
                  {data.dvol.change24h >= 0 ? "+" : ""}
                  {data.dvol.change24h.toFixed(1)} 24h
                </Text>
              )}
            </Group>
            <Text size="xs" c="dimmed">
              Options price in about ±{daily?.toFixed(1)}% a day (±{(data.dvol.current / Math.sqrt(52)).toFixed(1)}% a week) for {unit}
            </Text>
          </>
        ) : (
          <Text size="sm" c="dimmed">
            Not available right now
          </Text>
        )}
      </Card>
    </SimpleGrid>
  );
}

function ExpiryTable({ data, selected, onSelect, now }: { data: OptionsOverview; selected: string; onSelect: (code: string) => void; now: number }) {
  return (
    <TableScrollContainer minWidth={760} type="native">
      <Table highlightOnHover verticalSpacing={8} horizontalSpacing={10} fz="sm">
        <TableThead>
          <TableTr>
            {["Expiry", "Calls", "Puts", "P/C", "Notional", "Max pain", "ATM IV"].map((label, i) => (
              <TableTh key={label} ta={i ? "right" : undefined}>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  {label}
                </Text>
              </TableTh>
            ))}
          </TableTr>
        </TableThead>
        <TableTbody>
          {data.expiries.map((expiry: ExpirySummary) => {
            const pc = ratio(expiry.putOi, expiry.callOi);
            const isSelected = expiry.code === selected;
            return (
              <TableTr
                key={expiry.code}
                onClick={() => onSelect(expiry.code)}
                bg={isSelected ? "var(--mantine-primary-color-light)" : undefined}
                style={{ cursor: "pointer" }}
                aria-selected={isSelected}
              >
                <TableTd style={{ whiteSpace: "nowrap" }}>
                  <Text size="sm" fw={600} span>
                    {expiryDate(expiry.expiry)}
                  </Text>{" "}
                  <Text size="xs" c="dimmed" span>
                    {daysLeft(expiry.expiry, now)}
                  </Text>
                </TableTd>
                <TableTd ta="right" ff="monospace" c="teal">
                  {coins(expiry.callOi, data.currency)}
                </TableTd>
                <TableTd ta="right" ff="monospace" c="red">
                  {coins(expiry.putOi, data.currency)}
                </TableTd>
                <TableTd ta="right" ff="monospace">
                  {pc === null ? "—" : pc.toFixed(2)}
                </TableTd>
                <TableTd ta="right" ff="monospace">
                  {formatCompactUsd(expiry.notionalUsd)}
                </TableTd>
                <TableTd ta="right" style={{ whiteSpace: "nowrap" }}>
                  <Text size="sm" ff="monospace" span c="orange">
                    {expiry.maxPain === null ? "—" : formatStrike(expiry.maxPain)}
                  </Text>
                  {expiry.maxPain !== null && (
                    <Text size="xs" c="dimmed" span ml={6}>
                      {formatPercent(((expiry.maxPain - data.indexPrice) / data.indexPrice) * 100)}
                    </Text>
                  )}
                </TableTd>
                <TableTd ta="right" ff="monospace">
                  {expiry.atmIv === null ? "—" : `${expiry.atmIv.toFixed(1)}%`}
                </TableTd>
              </TableTr>
            );
          })}
        </TableTbody>
      </Table>
    </TableScrollContainer>
  );
}

export function OptionsDashboard({ initial }: { initial: OptionsOverview }) {
  const [currency, setCurrency] = useState<OptionCurrency>(initial.currency);
  const [states, setStates] = useState<Partial<Record<OptionCurrency, LoadState>>>({ [initial.currency]: { status: "ok", data: initial } });
  const [selected, setSelected] = useState<string>(ALL);
  const state: LoadState = states[currency] ?? { status: "loading" };
  const data = state.status === "ok" ? state.data : null;
  const now = data ? new Date(data.updatedAt).getTime() : new Date(initial.updatedAt).getTime();

  useEffect(() => {
    if (states[currency]) return;
    let active = true;
    fetch(`/api/options/${currency.toLowerCase()}`)
      .then(async (res): Promise<LoadState> => (res.ok ? { status: "ok", data: (await res.json()) as OptionsOverview } : { status: "error" }))
      .catch((): LoadState => ({ status: "error" }))
      .then((result) => {
        if (active) setStates((prev) => ({ ...prev, [currency]: result }));
      });
    return () => {
      active = false;
    };
  }, [currency, states]);

  const expiry = data?.expiries.find((e) => e.code === selected) ?? null;
  const chartStrikes = useMemo(() => {
    if (!data) return [];
    const rows = expiry ? expiry.strikes : mergeStrikes(data.expiries);
    const [low, high] = expiry ? [0.5, 1.8] : [0.6, 1.5];
    return rows.filter((row) => row.strike >= data.indexPrice * low && row.strike <= data.indexPrice * high);
  }, [data, expiry]);

  const expiryOptions = useMemo(
    () => [
      { value: ALL, label: "All expiries" },
      ...(data?.expiries.map((e) => ({ value: e.code, label: `${expiryDate(e.expiry)} · ${formatCompactUsd(e.notionalUsd)}` })) ?? []),
    ],
    [data],
  );

  const switchCurrency = (value: string) => {
    setCurrency(value as OptionCurrency);
    setSelected(ALL);
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between" gap="sm">
        <SegmentedControl value={currency} onChange={switchCurrency} data={[...OPTION_CURRENCIES]} aria-label="Underlying asset" />
        {data && (
          <Text size="xs" c="dimmed">
            {currency} index {formatPrice(data.indexPrice)} · Deribit data, updated <RelativeTime iso={data.updatedAt} />
          </Text>
        )}
      </Group>

      {state.status === "error" && (
        <Alert color="gray" variant="light">
          {currency} options data from Deribit couldn&apos;t be loaded just now. Try again in a minute.
        </Alert>
      )}

      <Box pos="relative" mih={state.status === "loading" ? 400 : undefined}>
        <LoadingOverlay visible={state.status === "loading"} overlayProps={{ blur: 1, backgroundOpacity: 0.2 }} />
        {data && (
          <Stack gap="xl">
            <Summary data={data} now={now} />

            <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md">
              <Stack gap="md">
                <Group justify="space-between" align="flex-end" gap="sm">
                  <Stack gap={2}>
                    <Group gap="xs">
                      <IconChartBar size={22} color="var(--mantine-color-teal-6)" />
                      <Title order={2} size="h3">
                        Open interest by strike
                      </Title>
                    </Group>
                    <Text size="sm" c="dimmed" maw={640}>
                      Where options traders are positioned. Big call walls above spot and put walls below often act as magnets or barriers into expiry.
                      {expiry?.maxPain ? " Max pain is the price where the most options would expire worthless." : ""}
                    </Text>
                  </Stack>
                  <Select data={expiryOptions} value={selected} onChange={(value) => value && setSelected(value)} allowDeselect={false} w={{ base: "100%", xs: 260 }} aria-label="Expiry" />
                </Group>
                <StrikeChart strikes={chartStrikes} spot={data.indexPrice} maxPain={expiry?.maxPain ?? null} unit={currency} />
              </Stack>
            </Paper>

            <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md">
              <Stack gap="sm">
                <Group gap="xs">
                  <Title order={2} size="h3">
                    Expiries
                  </Title>
                  <Badge variant="light" color="gray">
                    {data.expiries.length}
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Deribit options expire at 08:00 UTC. Click an expiry to chart its strikes. ATM IV is the implied volatility of the strike closest to the current price.
                </Text>
                <ExpiryTable data={data} selected={selected} onSelect={setSelected} now={now} />
              </Stack>
            </Paper>

            {data.dvol && (
              <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md">
                <Stack gap="sm">
                  <Group gap="xs">
                    <IconWaveSine size={22} color="var(--mantine-color-grape-6)" />
                    <Title order={2} size="h3">
                      {currency} volatility index (DVOL), 30 days
                    </Title>
                  </Group>
                  <Text size="sm" c="dimmed" maw={720}>
                    Deribit&apos;s DVOL is the 30-day implied volatility priced into {currency} options, like the VIX for crypto. Rising DVOL means traders expect bigger moves;
                    it tends to spike during sell-offs and fade in quiet markets.
                  </Text>
                  <Box h={{ base: 240, sm: 300 }}>
                    <DvolChart history={data.dvol.history} />
                  </Box>
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
