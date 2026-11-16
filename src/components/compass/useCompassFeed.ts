"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  mergeSeries,
  readAll,
  upsertMinute,
  type CompassSnapshot,
  type CompassTimeframe,
  type PressureReading,
} from "@/lib/buy-pressure";

export type CompassStatus = "connecting" | "live" | "paused" | "offline";

export const RING_SIZE = 10;

export interface RingSlot {
  slot: number;
  angle: number;
  reading: PressureReading;
}

export interface CompassView {
  readings: PressureReading[];
  ring: RingSlot[];
  leader: PressureReading | null;
  needleAngle: number;
  trackedCount: number;
  updatedAt: number;
}

const SNAPSHOT_REFRESH_MS = 60_000;
const FLUSH_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const LEADER_HYSTERESIS = 1;
const SOCKET_URL = "wss://fstream.binance.com/market/stream?streams=";

type KlineMessage = { data?: { e?: string; s?: string; k?: { t: number; q: string; Q: string; c: string } } };

function slotAngle(slot: number) {
  return (360 / RING_SIZE) * slot;
}

function shortestRotation(current: number, target: number) {
  const delta = ((((target - current) % 360) + 540) % 360) - 180;
  return current + delta;
}

export function useCompassFeed(enabled: boolean) {
  const [timeframe, setTimeframeState] = useState<CompassTimeframe>("1h");
  const [view, setView] = useState<CompassView | null>(null);
  const [status, setStatus] = useState<CompassStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [contracts, setContracts] = useState("");

  const snapshotRef = useRef<CompassSnapshot | null>(null);
  const timeframeRef = useRef<CompassTimeframe>("1h");
  const ringRef = useRef<string[] | null>(null);
  const leaderRef = useRef<string | null>(null);
  const angleRef = useRef(0);
  const dirtyRef = useRef(false);

  const recompute = useCallback((rebuildRing: boolean) => {
    const snapshot = snapshotRef.current;
    if (!snapshot) return;
    const readings = readAll(snapshot.coins, timeframeRef.current, Date.now());
    const byId = new Map(readings.map((r) => [r.id, r]));

    const eligible = readings.filter((r) => r.eligible);
    const best = eligible[0] ?? null;
    const current = leaderRef.current ? byId.get(leaderRef.current) : undefined;
    let leader: PressureReading | null = best;
    if (!rebuildRing && current?.eligible && best && best.id !== current.id && best.index - current.index < LEADER_HYSTERESIS) {
      leader = current;
    }
    leaderRef.current = leader?.id ?? null;

    let ring = ringRef.current?.filter((id) => byId.has(id)) ?? null;
    if (rebuildRing || !ring || ring.length < Math.min(RING_SIZE, readings.length)) {
      ring = readings
        .slice(0, RING_SIZE)
        .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
        .map((r) => r.id);
    }
    if (leader && !ring.includes(leader.id)) {
      let weakest = 0;
      ring.forEach((id, i) => {
        if ((byId.get(id)?.index ?? 0) < (byId.get(ring![weakest])?.index ?? 0)) weakest = i;
      });
      ring[weakest] = leader.id;
    }
    ringRef.current = ring;

    const slots: RingSlot[] = ring.map((id, slot) => ({ slot, angle: slotAngle(slot), reading: byId.get(id)! }));
    const leaderSlot = leader ? slots.find((s) => s.reading.id === leader.id) : undefined;
    if (leaderSlot) angleRef.current = shortestRotation(angleRef.current, leaderSlot.angle);

    setView({
      readings,
      ring: slots,
      leader,
      needleAngle: angleRef.current,
      trackedCount: snapshot.coins.length,
      updatedAt: Date.now(),
    });
  }, []);

  const setTimeframe = useCallback(
    (next: CompassTimeframe) => {
      timeframeRef.current = next;
      setTimeframeState(next);
      leaderRef.current = null;
      recompute(true);
    },
    [recompute],
  );

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const controller = new AbortController();

    const load = () => {
      fetch("/api/compass", { signal: controller.signal })
        .then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body?.error ?? "Buy pressure data is unavailable.");
          return body as CompassSnapshot;
        })
        .then((fresh) => {
          if (disposed) return;
          const previous = new Map(snapshotRef.current?.coins.map((coin) => [coin.id, coin.series]) ?? []);
          const firstLoad = snapshotRef.current === null;
          snapshotRef.current = {
            ...fresh,
            coins: fresh.coins.map((coin) => ({ ...coin, series: mergeSeries(coin.series, previous.get(coin.id)) })),
          };
          failures = 0;
          setError(null);
          setContracts(fresh.coins.map((coin) => coin.contract).join(","));
          recompute(firstLoad);
          timer = setTimeout(load, SNAPSHOT_REFRESH_MS);
        })
        .catch((err: Error) => {
          if (disposed || err.name === "AbortError") return;
          failures += 1;
          setError(err.message);
          timer = setTimeout(load, Math.min(5000 * 2 ** (failures - 1), SNAPSHOT_REFRESH_MS));
        });
    };

    load();
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, recompute]);

  useEffect(() => {
    if (!enabled || !contracts) return;
    const streams = contracts
      .split(",")
      .map((contract) => `${contract.toLowerCase()}@kline_1m`)
      .join("/");
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let disposed = false;
    let pendingStatus: CompassStatus | null = "connecting";

    const byContract = () => new Map(snapshotRef.current?.coins.map((coin) => [coin.contract, coin]) ?? []);
    let lookup = byContract();

    const connect = () => {
      if (disposed) return;
      pendingStatus = "connecting";
      socket = new WebSocket(SOCKET_URL + streams);
      socket.onopen = () => {
        attempts = 0;
        pendingStatus = "live";
      };
      socket.onmessage = (message) => {
        if (typeof message.data !== "string") return;
        let parsed: KlineMessage;
        try {
          parsed = JSON.parse(message.data);
        } catch {
          return;
        }
        const k = parsed.data?.k;
        if (parsed.data?.e !== "kline" || !k || !parsed.data.s) return;
        let coin = lookup.get(parsed.data.s);
        if (!coin) {
          lookup = byContract();
          coin = lookup.get(parsed.data.s);
          if (!coin) return;
        }
        if (upsertMinute(coin.series, k.t, Number(k.q), Number(k.Q), Number(k.c))) dirtyRef.current = true;
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        socket = null;
        if (disposed) return;
        pendingStatus = "offline";
        attempts += 1;
        retry = setTimeout(connect, Math.min(1000 * 2 ** (attempts - 1), MAX_BACKOFF_MS));
      };
    };

    const flush = setInterval(() => {
      if (pendingStatus) {
        setStatus(pendingStatus);
        pendingStatus = null;
      }
      if (dirtyRef.current) {
        dirtyRef.current = false;
        lookup = byContract();
        recompute(false);
      }
    }, FLUSH_MS);

    connect();
    return () => {
      disposed = true;
      clearInterval(flush);
      clearTimeout(retry);
      if (socket) {
        socket.onclose = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.close();
      }
    };
  }, [enabled, contracts, recompute]);

  return { view, status: enabled ? status : "paused", error, timeframe, setTimeframe };
}
