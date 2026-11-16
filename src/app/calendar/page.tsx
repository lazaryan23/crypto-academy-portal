import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { Container, Skeleton, Stack, Text, Title } from "@mantine/core";
import { CalendarView } from "@/components/calendar/CalendarView";
import { defaultOgImages } from "@/config/site";
import { getCryptoCalendar } from "@/lib/crypto-calendar";

export const metadata: Metadata = {
  title: "Crypto Calendar — Token Unlocks, CPI, FOMC and Macro Events",
  description:
    "Upcoming token unlocks with their size and share of circulating supply, alongside the macro events that move crypto: CPI, FOMC rate decisions, jobs and retail sales data.",
  alternates: { canonical: "/calendar" },
  openGraph: { url: "/calendar", images: defaultOgImages },
};

async function CalendarLoader() {
  await connection();
  const snapshot = await getCryptoCalendar();
  const coverage = snapshot.macroCoverageUntil ? new Date(snapshot.macroCoverageUntil).toISOString().slice(0, 10) : null;
  return (
    <Stack gap="md">
      <CalendarView snapshot={snapshot} />
      <Text size="xs" c="dimmed">
        Token unlocks come from DefiLlama&apos;s vesting schedules (scheduled cliff unlocks worth $1M+ or 0.05%+ of circulating supply), valued at current
        CoinGecko prices. Macro events come from the Forex Factory calendar{coverage ? `, which covers the current week through ${coverage}` : ""}; Fed rate
        decisions further out come from the Federal Reserve&apos;s published meeting schedule.
      </Text>
    </Stack>
  );
}

export default function CalendarPage() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={1}>Crypto calendar</Title>
          <Text c="dimmed" maw={760}>
            Scheduled token unlocks and the macro releases that move crypto. Large unlocks add new supply that early investors and teams can sell; CPI and Fed
            decisions shift risk appetite across all markets.
          </Text>
        </Stack>
        <Suspense
          fallback={
            <Stack gap="xs">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} h={64} radius="md" />
              ))}
            </Stack>
          }
        >
          <CalendarLoader />
        </Suspense>
      </Stack>
    </Container>
  );
}
