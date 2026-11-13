import type { ReactNode } from "react";
import Link from "next/link";
import { Box, Container, Group, ScrollArea, Skeleton, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { getFuturesOpenInterestBtc, getGlobalMarket } from "@/lib/coingecko";
import { getFearGreed } from "@/lib/fear-greed";
import { formatCompactUsd, formatPercent } from "@/lib/format";
import classes from "./MarketPulse.module.css";

function fearGreedColor(value: number) {
  if (value < 25) return "red";
  if (value < 45) return "orange";
  if (value <= 55) return "yellow";
  if (value < 75) return "lime";
  return "teal";
}

function PulseItem({
  label,
  tooltip,
  href,
  external,
  children,
}: {
  label: string;
  tooltip: string;
  href?: string;
  external?: boolean;
  children: ReactNode;
}) {
  const body = (
    <Group gap={6} wrap="nowrap" className={classes.item}>
      <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
        {label}
      </Text>
      {children}
      <IconInfoCircle size={12} className={classes.info} aria-hidden />
    </Group>
  );
  return (
    <Tooltip label={tooltip} multiline w={280} withArrow events={{ hover: true, focus: true, touch: true }}>
      {href && external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes.link}>
          {body}
        </a>
      ) : href ? (
        <Link href={href} className={classes.link}>
          {body}
        </Link>
      ) : (
        <Box tabIndex={0} className={classes.link}>
          {body}
        </Box>
      )}
    </Tooltip>
  );
}

function Value({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <Text size="xs" fw={700} ff="monospace" c={color} style={{ whiteSpace: "nowrap" }}>
      {children}
    </Text>
  );
}

function Bar({ children }: { children: ReactNode }) {
  return (
    <Box className={classes.bar}>
      <Container size="xl" h="100%">
        <ScrollArea type="never" h="100%" aria-label="Market pulse">
          <Group gap="xl" wrap="nowrap" h={36}>
            {children}
          </Group>
        </ScrollArea>
      </Container>
    </Box>
  );
}

export function MarketPulseSkeleton() {
  return (
    <Bar>
      {[150, 130, 170, 150].map((w, i) => (
        <Skeleton key={i} h={12} w={w} radius="xl" />
      ))}
    </Bar>
  );
}

export async function MarketPulse() {
  const [global, fearGreed, openInterestBtc] = await Promise.all([getGlobalMarket(), getFearGreed(), getFuturesOpenInterestBtc()]);
  const openInterestUsd = openInterestBtc && global?.btcPriceUsd ? openInterestBtc * global.btcPriceUsd : null;
  const change = global?.marketCapChange24h ?? null;

  return (
    <Bar>
      <PulseItem label="Market cap" tooltip="The combined value of every cryptocurrency CoinGecko tracks, with its change over the last 24 hours.">
        <Value>{global ? formatCompactUsd(global.totalMarketCapUsd) : "—"}</Value>
        {change !== null && <Value color={change >= 0 ? "teal" : "red"}>{formatPercent(change)}</Value>}
      </PulseItem>
      <PulseItem
        label="BTC dominance"
        href="/crypto/bitcoin"
        tooltip="Bitcoin's share of the total crypto market cap. When it rises, money is usually moving out of altcoins and into BTC."
      >
        <Value>{global?.btcDominance != null ? `${global.btcDominance.toFixed(1)}%` : "—"}</Value>
      </PulseItem>
      <PulseItem
        label="Fear & Greed"
        href="https://alternative.me/crypto/fear-and-greed-index/"
        external
        tooltip="alternative.me's daily sentiment score from 0 (extreme fear) to 100 (extreme greed), based on volatility, volume, social media and dominance."
      >
        {fearGreed ? (
          <Value color={fearGreedColor(fearGreed.value)}>
            {fearGreed.value} · {fearGreed.label}
          </Value>
        ) : (
          <Value>—</Value>
        )}
      </PulseItem>
      <PulseItem
        label="Futures open interest"
        href="/academy/understanding-leverage"
        tooltip="The value of all open futures positions on the 20 largest derivatives exchanges. More open interest means more leverage in the market, and bigger liquidation cascades when prices move fast."
      >
        <Value>{openInterestUsd ? formatCompactUsd(openInterestUsd) : "—"}</Value>
      </PulseItem>
    </Bar>
  );
}
