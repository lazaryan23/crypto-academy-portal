"use client";

import { useState } from "react";
import { Card, Grid, GridCol, Group, NumberInput, RingProgress, SegmentedControl, ScrollArea, Stack, Text } from "@mantine/core";
import { allocationProfiles } from "@/content/investing";
import { formatPrice } from "@/lib/format";

export function AllocationPlanner() {
  const [profileValue, setProfileValue] = useState(allocationProfiles[0].value);
  const [amount, setAmount] = useState<number>(10000);
  const profile = allocationProfiles.find((p) => p.value === profileValue) ?? allocationProfiles[0];

  return (
    <Card padding="xl">
      <Stack gap="lg">
        <ScrollArea type="never">
          <SegmentedControl
            value={profileValue}
            onChange={setProfileValue}
            data={allocationProfiles.map((p) => ({ value: p.value, label: p.label }))}
            aria-label="Allocation profile"
          />
        </ScrollArea>
        <Text c="dimmed">{profile.description}</Text>
        <Grid gap="xl" align="center">
          <GridCol span={{ base: 12, sm: 5 }}>
            <Group justify="center">
              <RingProgress
                size={220}
                thickness={26}
                roundCaps={false}
                sections={profile.buckets.map((b) => ({ value: b.percent, color: b.color, tooltip: `${b.label}: ${b.percent}%` }))}
                label={
                  <Stack gap={0} align="center">
                    <Text size="xs" c="dimmed">
                      Portfolio
                    </Text>
                    <Text fw={800} ff="monospace">
                      {formatPrice(amount)}
                    </Text>
                  </Stack>
                }
              />
            </Group>
          </GridCol>
          <GridCol span={{ base: 12, sm: 7 }}>
            <Stack gap="md">
              <NumberInput label="Amount to invest (USD)" value={amount} onChange={(v) => setAmount(Number(v) || 0)} min={0} thousandSeparator="," prefix="$" />
              {profile.buckets.map((bucket) => (
                <Group key={bucket.label} justify="space-between" wrap="nowrap" align="flex-start">
                  <Group gap="sm" wrap="nowrap" align="flex-start">
                    <div style={{ width: 12, height: 12, borderRadius: 3, marginTop: 5, background: `var(--mantine-color-${bucket.color}-6)`, flexShrink: 0 }} />
                    <Stack gap={0}>
                      <Text fw={600}>
                        {bucket.label} · {bucket.percent}%
                      </Text>
                      <Text size="xs" c="dimmed">
                        {bucket.examples}
                      </Text>
                    </Stack>
                  </Group>
                  <Text fw={700} ff="monospace">
                    {formatPrice((amount * bucket.percent) / 100)}
                  </Text>
                </Group>
              ))}
            </Stack>
          </GridCol>
        </Grid>
      </Stack>
    </Card>
  );
}
