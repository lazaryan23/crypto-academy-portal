"use client";

import { ActionIcon, Tooltip, type ActionIconProps } from "@mantine/core";
import { IconStar, IconStarFilled } from "@tabler/icons-react";
import { useWatchlist } from "@/lib/watchlist";

export function WatchlistButton({ coinId, coinName, size = "md" }: { coinId: string; coinName: string; size?: ActionIconProps["size"] }) {
  const { has, toggle } = useWatchlist();
  const active = has(coinId);
  const label = active ? `Remove ${coinName} from watchlist` : `Add ${coinName} to watchlist`;
  const iconSize = size === "lg" ? 20 : 16;

  return (
    <Tooltip label={active ? "Remove from watchlist" : "Add to watchlist"} withArrow openDelay={300}>
      <ActionIcon
        variant="subtle"
        color={active ? "yellow" : "gray"}
        size={size}
        aria-label={label}
        aria-pressed={active}
        onClick={(e) => {
          e.stopPropagation();
          toggle(coinId);
        }}
      >
        {active ? <IconStarFilled size={iconSize} /> : <IconStar size={iconSize} />}
      </ActionIcon>
    </Tooltip>
  );
}
