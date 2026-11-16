"use client";

import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Drawer,
  Group,
  Indicator,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBell, IconTrash } from "@tabler/icons-react";
import { MAX_PRICE_ALERTS, useAlerts, type PriceCondition } from "@/lib/alerts";
import { formatPrice } from "@/lib/format";
import { useWatchlist } from "@/lib/watchlist";

type CoinOption = { id: string; name: string; symbol: string; price: number | null };

function useCoinOptions() {
  const [coins, setCoins] = useState<CoinOption[] | null>(null);
  const [requested, setRequested] = useState(false);
  const load = () => {
    if (requested) return;
    setRequested(true);
    fetch("/api/markets?category=top")
      .then((res) => (res.ok ? (res.json() as Promise<{ id: string; name: string; symbol: string; current_price: number | null }[]>) : []))
      .then((list) => setCoins(list.map((c) => ({ id: c.id, name: c.name, symbol: c.symbol, price: c.current_price }))))
      .catch(() => {
        setRequested(false);
        setCoins([]);
      });
  };
  return { coins, load };
}

function supportsBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function AlertsMenu() {
  const [opened, { open, close }] = useDisclosure(false);
  const { alerts, settings, activeCount, addAlert, removeAlert, updateSettings } = useAlerts();
  const { ids: watchlist } = useWatchlist();
  const { coins, load } = useCoinOptions();
  const [coinId, setCoinId] = useState<string | null>(null);
  const [condition, setCondition] = useState<PriceCondition>("above");
  const [price, setPrice] = useState<number | "">("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | null>(null);

  const coin = coins?.find((c) => c.id === coinId) ?? null;

  const chooseCoin = (id: string | null) => {
    setCoinId(id);
    const next = coins?.find((c) => c.id === id);
    if (next?.price) setPrice(Number(next.price.toPrecision(6)));
  };

  const submit = () => {
    if (!coin || price === "" || !(price > 0)) return;
    addAlert({ coinId: coin.id, coinName: coin.name, symbol: coin.symbol, condition, price });
    setPrice("");
  };

  const toggleBrowser = async (enabled: boolean) => {
    if (!enabled) return updateSettings({ browserNotifications: false });
    if (!supportsBrowserNotifications()) return setPermission("unsupported");
    const result = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    setPermission(result);
    updateSettings({ browserNotifications: result === "granted" });
  };

  return (
    <>
      <Tooltip label="Alerts" withArrow>
        <Indicator label={activeCount} size={16} disabled={!activeCount} color="brand" offset={4}>
          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => {
              load();
              open();
            }}
            aria-label={`Alerts${activeCount ? `, ${activeCount} active` : ""}`}
          >
            <IconBell size={18} />
          </ActionIcon>
        </Indicator>
      </Tooltip>

      <Drawer opened={opened} onClose={close} position="right" title={<Text fw={700}>Alerts</Text>} size="md">
        <Stack gap="lg">
          <Text size="sm" c="dimmed">
            Alerts are saved in this browser and checked while CoinCompass is open in a tab. No account needed.
          </Text>

          <Stack gap="sm">
            <Text fw={700}>Price alerts</Text>
            <Select
              label="Coin"
              placeholder={coins ? "Pick a coin" : "Loading coins…"}
              data={(coins ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.symbol.toUpperCase()})` }))}
              value={coinId}
              onChange={chooseCoin}
              searchable
              nothingFoundMessage="No match"
              disabled={!coins}
              comboboxProps={{ withinPortal: false }}
            />
            <Group grow align="flex-end">
              <SegmentedControl
                value={condition}
                onChange={(value) => setCondition(value as PriceCondition)}
                data={[
                  { value: "above", label: "Rises above" },
                  { value: "below", label: "Falls below" },
                ]}
                aria-label="Alert condition"
              />
              <NumberInput
                label="Price ($)"
                value={price}
                onChange={(v) => setPrice(v === "" ? "" : Number(v))}
                min={0}
                thousandSeparator=","
                decimalScale={8}
              />
            </Group>
            {coin?.price != null && (
              <Text size="xs" c="dimmed">
                {coin.symbol.toUpperCase()} is at {formatPrice(coin.price)} now.
              </Text>
            )}
            <Button onClick={submit} disabled={!coin || price === "" || !(price > 0) || alerts.length >= MAX_PRICE_ALERTS}>
              Add price alert
            </Button>

            {alerts.length > 0 && (
              <Stack gap={6}>
                {[...alerts].reverse().map((alert) => (
                  <Paper key={alert.id} withBorder p="xs" radius="md" opacity={alert.triggeredAt ? 0.6 : 1}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm">
                        <b>{alert.symbol.toUpperCase()}</b> {alert.condition === "above" ? "above" : "below"} {formatPrice(alert.price)}
                      </Text>
                      <Group gap={6} wrap="nowrap">
                        {alert.triggeredAt && (
                          <Badge size="xs" color="teal" variant="light">
                            Triggered
                          </Badge>
                        )}
                        <ActionIcon variant="subtle" color="gray" onClick={() => removeAlert(alert.id)} aria-label="Delete alert">
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>

          <Divider />

          <Stack gap="sm">
            <Switch
              checked={settings.funding.enabled}
              onChange={(event) => updateSettings({ funding: { ...settings.funding, enabled: event.currentTarget.checked } })}
              label="Extreme funding on watchlist coins"
              description="Notifies when longs or shorts pay more than the threshold, at most once every 4 hours per coin."
            />
            <NumberInput
              label="Threshold (annualized %)"
              value={settings.funding.thresholdApr}
              onChange={(v) => updateSettings({ funding: { ...settings.funding, thresholdApr: Math.max(5, Number(v) || 50) } })}
              min={5}
              max={500}
              step={5}
              disabled={!settings.funding.enabled}
            />
            {settings.funding.enabled && watchlist.length === 0 && (
              <Text size="xs" c="orange">
                Star some coins first: funding alerts only watch your watchlist.
              </Text>
            )}
          </Stack>

          <Divider />

          <Stack gap={4}>
            <Switch
              checked={settings.browserNotifications}
              onChange={(event) => void toggleBrowser(event.currentTarget.checked)}
              label="Browser notifications"
              description="Also show a system notification when CoinCompass is in a background tab."
            />
            {permission === "denied" && (
              <Text size="xs" c="orange">
                Notifications are blocked for this site in your browser settings.
              </Text>
            )}
            {permission === "unsupported" && (
              <Text size="xs" c="orange">
                This browser doesn&apos;t support notifications.
              </Text>
            )}
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
}
