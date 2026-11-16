"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@mantine/hooks";

export type PriceCondition = "above" | "below";

export interface PriceAlert {
  id: string;
  coinId: string;
  coinName: string;
  symbol: string;
  condition: PriceCondition;
  price: number;
  createdAt: number;
  triggeredAt: number | null;
}

export interface FundingAlertSettings {
  enabled: boolean;
  thresholdApr: number;
}

export interface AlertSettings {
  funding: FundingAlertSettings;
  browserNotifications: boolean;
}

export const MAX_PRICE_ALERTS = 20;
export const FUNDING_COOLDOWN_MS = 4 * 60 * 60 * 1000;

const defaultSettings: AlertSettings = { funding: { enabled: false, thresholdApr: 50 }, browserNotifications: false };
const emptyAlerts: PriceAlert[] = [];
const emptyNotified: Record<string, number> = {};

function safeParse<T>(fallback: T, guard: (value: unknown) => boolean) {
  return (value: string | undefined): T => {
    if (!value) return fallback;
    try {
      const parsed: unknown = JSON.parse(value);
      return guard(parsed) ? (parsed as T) : fallback;
    } catch {
      return fallback;
    }
  };
}

const isObject = (value: unknown) => typeof value === "object" && value !== null;

export function priceAlertMet(alert: Pick<PriceAlert, "condition" | "price">, price: number) {
  return alert.condition === "above" ? price >= alert.price : price <= alert.price;
}

export function useAlerts() {
  const [alerts, setAlerts] = useLocalStorage<PriceAlert[]>({
    key: "coincompass:price-alerts",
    defaultValue: emptyAlerts,
    deserialize: safeParse(emptyAlerts, Array.isArray),
  });
  const [settings, setSettings] = useLocalStorage<AlertSettings>({
    key: "coincompass:alert-settings",
    defaultValue: defaultSettings,
    deserialize: safeParse(defaultSettings, (v) => isObject(v) && isObject((v as AlertSettings).funding)),
  });
  const [notified, setNotified] = useLocalStorage<Record<string, number>>({
    key: "coincompass:alert-notified",
    defaultValue: emptyNotified,
    deserialize: safeParse(emptyNotified, isObject),
  });

  const addAlert = useCallback(
    (alert: Omit<PriceAlert, "id" | "createdAt" | "triggeredAt">) =>
      setAlerts((current) =>
        [...current, { ...alert, id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now(), triggeredAt: null }].slice(
          -MAX_PRICE_ALERTS,
        ),
      ),
    [setAlerts],
  );

  const removeAlert = useCallback((id: string) => setAlerts((current) => current.filter((alert) => alert.id !== id)), [setAlerts]);

  const markTriggered = useCallback(
    (ids: string[]) => setAlerts((current) => current.map((alert) => (ids.includes(alert.id) ? { ...alert, triggeredAt: Date.now() } : alert))),
    [setAlerts],
  );

  const updateSettings = useCallback((patch: Partial<AlertSettings>) => setSettings((current) => ({ ...current, ...patch })), [setSettings]);

  const markNotified = useCallback(
    (keys: string[]) =>
      setNotified((current) => {
        const now = Date.now();
        const fresh = Object.fromEntries(Object.entries(current).filter(([, at]) => now - at < FUNDING_COOLDOWN_MS));
        for (const key of keys) fresh[key] = now;
        return fresh;
      }),
    [setNotified],
  );

  const activeCount = alerts.filter((alert) => !alert.triggeredAt).length + (settings.funding.enabled ? 1 : 0);

  return { alerts, settings, notified, activeCount, addAlert, removeAlert, markTriggered, updateSettings, markNotified };
}
