"use client";

import { useEffect, useRef } from "react";
import { notifications } from "@mantine/notifications";
import { useDocumentVisibility } from "@mantine/hooks";
import type { DerivativesOverview } from "@/lib/derivatives-market";
import { funding8hToApr } from "@/lib/funding";
import { formatPrice } from "@/lib/format";
import { FUNDING_COOLDOWN_MS, priceAlertMet, useAlerts } from "@/lib/alerts";
import { useWatchlist } from "@/lib/watchlist";

const PRICE_POLL_MS = 60_000;
const FUNDING_POLL_MS = 180_000;

function notify(title: string, message: string, color: string, browser: boolean) {
  notifications.show({ title, message, color, autoClose: 12_000 });
  if (browser && typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
    new Notification(title, { body: message, tag: title });
  }
}

export function AlertsRunner() {
  const visibility = useDocumentVisibility();
  const { alerts, settings, notified, markTriggered, markNotified } = useAlerts();
  const { ids: watchlist } = useWatchlist();
  const state = useRef({ alerts, settings, notified, watchlist, markTriggered, markNotified });

  useEffect(() => {
    state.current = { alerts, settings, notified, watchlist, markTriggered, markNotified };
  });

  const pending = alerts.filter((alert) => !alert.triggeredAt);
  const priceIds = [...new Set(pending.map((alert) => alert.coinId))].sort().join(",");
  const fundingOn = settings.funding.enabled && watchlist.length > 0;
  const active = visibility === "visible" || settings.browserNotifications;

  useEffect(() => {
    if (!priceIds || !active) return;
    let disposed = false;
    const check = () => {
      fetch(`/api/markets?ids=${priceIds}`)
        .then((res) => (res.ok ? (res.json() as Promise<{ id: string; current_price: number | null }[]>) : Promise.reject(new Error(String(res.status)))))
        .then((coins) => {
          if (disposed) return;
          const prices = new Map(coins.map((coin) => [coin.id, coin.current_price]));
          const { alerts: current, settings: s, markTriggered: mark } = state.current;
          const hit = current.filter((alert) => {
            const price = prices.get(alert.coinId);
            return !alert.triggeredAt && price != null && priceAlertMet(alert, price);
          });
          if (!hit.length) return;
          mark(hit.map((alert) => alert.id));
          for (const alert of hit) {
            notify(
              `${alert.symbol.toUpperCase()} is ${alert.condition} ${formatPrice(alert.price)}`,
              `${alert.coinName} is now ${formatPrice(prices.get(alert.coinId) ?? null)}.`,
              alert.condition === "above" ? "teal" : "red",
              s.browserNotifications,
            );
          }
        })
        .catch(() => undefined);
    };
    check();
    const timer = setInterval(check, PRICE_POLL_MS);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [priceIds, active]);

  useEffect(() => {
    if (!fundingOn || !active) return;
    let disposed = false;
    const check = () => {
      fetch("/api/derivatives")
        .then((res) => (res.ok ? (res.json() as Promise<DerivativesOverview>) : Promise.reject(new Error(String(res.status)))))
        .then((overview) => {
          if (disposed) return;
          const { settings: s, notified: seen, watchlist: ids, markNotified: mark } = state.current;
          const now = Date.now();
          const watched = new Set(ids);
          const extreme = overview.rows.filter((row) => {
            if (!watched.has(row.id) || row.avgFunding8h === null) return false;
            const apr = funding8hToApr(row.avgFunding8h);
            const key = `funding:${row.id}:${apr >= 0 ? "pos" : "neg"}`;
            return Math.abs(apr) >= s.funding.thresholdApr && !(seen[key] && now - seen[key] < FUNDING_COOLDOWN_MS);
          });
          if (!extreme.length) return;
          mark(extreme.map((row) => `funding:${row.id}:${(row.avgFunding8h ?? 0) >= 0 ? "pos" : "neg"}`));
          for (const row of extreme) {
            const apr = funding8hToApr(row.avgFunding8h ?? 0);
            notify(
              `Extreme funding on ${row.symbol}`,
              `${apr >= 0 ? "Longs" : "Shorts"} are paying ${Math.abs(apr).toFixed(0)}% a year. Crowded positioning can precede a squeeze.`,
              "orange",
              s.browserNotifications,
            );
          }
        })
        .catch(() => undefined);
    };
    check();
    const timer = setInterval(check, FUNDING_POLL_MS);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [fundingOn, active]);

  return null;
}
