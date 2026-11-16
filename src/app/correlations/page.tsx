import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert, Container, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { CorrelationMatrix } from "@/components/correlations/CorrelationMatrix";
import { defaultOgImages } from "@/config/site";
import { getCorrelations } from "@/lib/correlations";

export const metadata: Metadata = {
  title: "Crypto Correlation Matrix — Bitcoin vs Gold, S&P 500, Nasdaq and DXY",
  description:
    "How closely Bitcoin, Ethereum and Solana move with gold, the S&P 500, the Nasdaq and the US dollar index, using 30-day and 90-day correlations of daily returns.",
  alternates: { canonical: "/correlations" },
  openGraph: { url: "/correlations", images: defaultOgImages },
};

const notes = [
  {
    title: "Crypto and stocks",
    text: "A high correlation with the Nasdaq means crypto is trading as a risk asset: it rallies and sells off with tech stocks on the same macro news.",
  },
  {
    title: "Crypto and the dollar",
    text: "Bitcoin has often moved against the dollar index. A strong dollar tightens global liquidity, which tends to weigh on speculative assets.",
  },
  {
    title: "Crypto and gold",
    text: "If Bitcoin is acting as digital gold, its correlation with gold rises. In practice the relationship comes and goes.",
  },
];

async function MatrixLoader() {
  const snapshot = await getCorrelations();
  if (!snapshot) {
    return (
      <Alert color="gray" variant="light" title="Correlation data is temporarily unavailable">
        We couldn&apos;t load price history for every asset just now. This page refreshes automatically.
      </Alert>
    );
  }
  return (
    <Paper withBorder p={{ base: "md", sm: "lg" }} radius="md">
      <CorrelationMatrix snapshot={snapshot} />
    </Paper>
  );
}

export default function CorrelationsPage() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={1}>Crypto vs traditional markets</Title>
          <Text c="dimmed" maw={760}>
            Whether Bitcoin, Ethereum and Solana are moving with stocks, gold or the dollar right now. Hover any cell for what the number means.
          </Text>
        </Stack>
        <Suspense fallback={<Skeleton h={420} radius="md" />}>
          <MatrixLoader />
        </Suspense>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          {notes.map((note) => (
            <Paper key={note.title} withBorder p="lg" radius="md">
              <Title order={2} size="h4" mb={6}>
                {note.title}
              </Title>
              <Text size="sm" c="dimmed">
                {note.text}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
        <Text size="xs" c="dimmed">
          Daily closing prices from Yahoo Finance. Crypto trades every day while traditional markets close on weekends and holidays, so only days when all
          markets traded are compared. Correlation describes the past and can change quickly.
        </Text>
      </Stack>
    </Container>
  );
}
