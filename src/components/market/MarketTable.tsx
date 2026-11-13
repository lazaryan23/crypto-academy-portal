"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Group, Stack, Table, TableScrollContainer, TableTbody, TableTd, TableTh, TableThead, TableTr, Text } from "@mantine/core";
import type { CoinMarket } from "@/types/coingecko";
import { formatCompactUsd, formatPrice } from "@/lib/format";
import { PercentChange } from "@/components/common/PercentChange";
import { Sparkline } from "@/components/common/Sparkline";
import { WatchlistButton } from "@/components/common/WatchlistButton";
import classes from "./MarketTable.module.css";

export function MarketTable({
  coins,
  rankOf = (coin) => coin.market_cap_rank,
}: {
  coins: CoinMarket[];
  rankOf?: (coin: CoinMarket) => number | null;
}) {
  const router = useRouter();

  return (
    <TableScrollContainer minWidth={360}>
      <Table verticalSpacing="sm" horizontalSpacing="md">
        <TableThead>
          <TableTr>
            <TableTh w={48} pl="sm" pr={0}>
              <span className={classes.srOnly}>Watchlist</span>
            </TableTh>
            <TableTh w={40} pl={0}>
              #
            </TableTh>
            <TableTh>Name</TableTh>
            <TableTh ta="right">Price</TableTh>
            <TableTh ta="right">24h</TableTh>
            <TableTh ta="right" visibleFrom="md">
              7d
            </TableTh>
            <TableTh ta="right" visibleFrom="sm">
              24h Volume
            </TableTh>
            <TableTh ta="right" visibleFrom="sm">
              Market Cap
            </TableTh>
            <TableTh ta="right" visibleFrom="lg">
              Last 7 days
            </TableTh>
          </TableTr>
        </TableThead>
        <TableTbody>
          {coins.map((coin) => (
            <TableTr
              key={coin.id}
              onClick={() => router.push(`/crypto/${coin.id}`)}
              className={classes.row}
            >
              <TableTd pl="sm" pr={0}>
                <WatchlistButton coinId={coin.id} coinName={coin.name} size="sm" />
              </TableTd>
              <TableTd pl={0}>
                <Text size="sm" c="dimmed">
                  {rankOf(coin) ?? "—"}
                </Text>
              </TableTd>
              <TableTd>
                <Group gap="sm" wrap="nowrap">
                  <Avatar src={coin.image} alt={coin.name} size={28} />
                  <Stack gap={0} style={{ minWidth: 0 }}>
                    <Text
                      component={Link}
                      href={`/crypto/${coin.id}`}
                      fw={600}
                      size="sm"
                      truncate
                      className={classes.coinName}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {coin.name}
                    </Text>
                    <Text size="xs" c="dimmed" tt="uppercase">
                      {coin.symbol}
                    </Text>
                  </Stack>
                </Group>
              </TableTd>
              <TableTd ta="right">
                <Text size="sm" ff="monospace" fw={600}>
                  {formatPrice(coin.current_price)}
                </Text>
              </TableTd>
              <TableTd ta="right">
                <PercentChange value={coin.price_change_percentage_24h} />
              </TableTd>
              <TableTd ta="right" visibleFrom="md">
                <PercentChange value={coin.price_change_percentage_7d_in_currency} />
              </TableTd>
              <TableTd ta="right" visibleFrom="sm">
                <Text size="sm" ff="monospace">
                  {formatCompactUsd(coin.total_volume)}
                </Text>
              </TableTd>
              <TableTd ta="right" visibleFrom="sm">
                <Text size="sm" ff="monospace">
                  {formatCompactUsd(coin.market_cap)}
                </Text>
              </TableTd>
              <TableTd ta="right" visibleFrom="lg">
                <Group justify="flex-end">
                  <Sparkline data={coin.sparkline_in_7d?.price ?? []} />
                </Group>
              </TableTd>
            </TableTr>
          ))}
        </TableTbody>
      </Table>
    </TableScrollContainer>
  );
}
