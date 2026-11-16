"use client";

import { useState } from "react";
import { Alert, Badge, Group, Paper, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { EtfAsset, EtfFlows } from "@/lib/etf-flows-config";
import { formatCompactUsd } from "@/lib/format";
import { EtfFlowChart } from "./EtfFlowChart";

function signedUsd(value: number) {
  return `${value >= 0 ? "+" : "−"}${formatCompactUsd(Math.abs(value))}`;
}

function Stat({ label, value, color, hint }: { label: string; value: string; color?: string; hint: string }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={800} fz={24} ff="monospace" c={color} mt={4}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {hint}
      </Text>
    </Paper>
  );
}

function Issuers({ flows }: { flows: EtfFlows }) {
  const max = Math.max(1, ...flows.issuers.map((issuer) => Math.abs(issuer.dailyFlowUsd)));
  return (
    <Stack gap={8}>
      {flows.issuers.map((issuer) => {
        const share = (Math.abs(issuer.dailyFlowUsd) / max) * 50;
        const positive = issuer.dailyFlowUsd >= 0;
        return (
          <Group key={`${issuer.ticker}-${issuer.issuer}`} gap="sm" wrap="nowrap">
            <Stack gap={0} w={110}>
              <Text size="sm" fw={700}>
                {issuer.ticker}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {issuer.issuer}
              </Text>
            </Stack>
            <div style={{ position: "relative", flex: 1, height: 14 }}>
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--mantine-color-default-border)" }} />
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  bottom: 2,
                  borderRadius: 3,
                  background: `var(--mantine-color-${positive ? "teal" : "red"}-6)`,
                  left: positive ? "50%" : `${50 - share}%`,
                  width: `${Math.max(share, 0.5)}%`,
                }}
              />
            </div>
            <Text size="sm" ff="monospace" fw={700} w={84} ta="right" c={issuer.dailyFlowUsd === 0 ? "dimmed" : positive ? "teal" : "red"}>
              {signedUsd(issuer.dailyFlowUsd)}
            </Text>
          </Group>
        );
      })}
    </Stack>
  );
}

export function EtfFlowsPanel({ data }: { data: Record<EtfAsset, EtfFlows> }) {
  const [asset, setAsset] = useState<EtfAsset>("BTC");
  const flows = data[asset];
  const latest = flows.days[flows.days.length - 1];
  const thirtyDay = flows.days.reduce((sum, day) => sum + day.netFlowUsd, 0);
  const inflowDays = flows.days.filter((day) => day.netFlowUsd > 0).length;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <SegmentedControl
          value={asset}
          onChange={(value) => setAsset(value as EtfAsset)}
          data={[
            { value: "BTC", label: "Bitcoin ETFs" },
            { value: "ETH", label: "Ether ETFs" },
          ]}
          aria-label="ETF asset"
        />
        {flows.source === "sample" ? (
          <Badge color="yellow" variant="light" size="lg">
            Sample data
          </Badge>
        ) : (
          <Text size="xs" c="dimmed">
            Source: SoSoValue · as of {flows.asOf}
          </Text>
        )}
      </Group>

      {flows.source === "sample" && (
        <Alert color="yellow" variant="light" icon={<IconInfoCircle size={18} />}>
          These figures are illustrative placeholders, not real ETF flows. Live data appears automatically once a SoSoValue API key is configured.
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
        <Stat label="Latest daily net flow" value={signedUsd(latest.netFlowUsd)} color={latest.netFlowUsd >= 0 ? "teal" : "red"} hint={latest.date} />
        <Stat
          label="30-day net flow"
          value={signedUsd(thirtyDay)}
          color={thirtyDay >= 0 ? "teal" : "red"}
          hint={`${inflowDays} of ${flows.days.length} days were inflows`}
        />
        <Stat
          label={flows.source === "sample" ? "Cumulative (30 days)" : "Cumulative since launch"}
          value={signedUsd(flows.cumulativeUsd)}
          color={flows.cumulativeUsd >= 0 ? "teal" : "red"}
          hint="Total net money added to the funds"
        />
        <Stat label="Total net assets" value={formatCompactUsd(flows.totalNetAssetsUsd)} hint="Value held by all US spot funds" />
      </SimpleGrid>

      <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md">
        <Text fw={700} mb="sm">
          Daily net flows · last {flows.days.length} trading days
        </Text>
        <EtfFlowChart days={flows.days} />
      </Paper>

      <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md">
        <Text fw={700}>Flows by issuer · {latest.date}</Text>
        <Text size="xs" c="dimmed" mb="md">
          Green bars are net inflows (new shares created), red bars are net outflows (shares redeemed).
        </Text>
        <Issuers flows={flows} />
      </Paper>
    </Stack>
  );
}
