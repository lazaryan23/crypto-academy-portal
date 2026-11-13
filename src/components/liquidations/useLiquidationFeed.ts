"use client";

import { useEffect, useState } from "react";
import {
  addToTally,
  emptyTally,
  LIQUIDATION_EXCHANGES,
  parseBinance,
  parseBybit,
  parseOkx,
  type ContractValues,
  type LiquidationEvent,
  type LiquidationExchange,
  type LiquidationTally,
} from "@/lib/liquidation-feed";

export type FeedStatus = "connecting" | "live" | "paused" | "offline";

export interface FeedSnapshot {
  events: LiquidationEvent[];
  session: LiquidationTally;
  byExchange: Record<LiquidationExchange, LiquidationTally>;
  byCoin: Record<string, LiquidationTally>;
  largest: LiquidationEvent | null;
  startedAt: number | null;
  status: Record<LiquidationExchange, FeedStatus>;
}

const MAX_EVENTS = 200;
const FLUSH_MS = 1000;
const PING_MS = 20_000;
const STALE_MS = 60_000;
const MAX_BACKOFF_MS = 30_000;
const BYBIT_BATCH = 10;

function initialSnapshot(): FeedSnapshot {
  return {
    events: [],
    session: emptyTally(),
    byExchange: { Binance: emptyTally(), Bybit: emptyTally(), OKX: emptyTally() },
    byCoin: {},
    largest: null,
    startedAt: null,
    status: { Binance: "connecting", Bybit: "connecting", OKX: "connecting" },
  };
}

interface Connector {
  url: string;
  subscribe: (socket: WebSocket) => void;
  ping: ((socket: WebSocket) => void) | null;
  parse: (data: unknown) => LiquidationEvent[];
}

export function useLiquidationFeed({ okxContractValues, bybitSymbols }: { okxContractValues: ContractValues; bybitSymbols: Record<string, string> }) {
  const [snapshot, setSnapshot] = useState<FeedSnapshot>(initialSnapshot);

  useEffect(() => {
    const startedAt = Date.now();
    const seen = new Set<string>();
    const pending: LiquidationEvent[] = [];
    const statusChanges: Partial<Record<LiquidationExchange, FeedStatus>> = {};
    const sockets = new Map<LiquidationExchange, WebSocket>();
    const pings = new Map<LiquidationExchange, ReturnType<typeof setInterval>>();
    const retries = new Map<LiquidationExchange, ReturnType<typeof setTimeout>>();
    const attempts = new Map<LiquidationExchange, number>();
    let paused = false;
    let disposed = false;

    const bybitTopics = Object.keys(bybitSymbols).map((symbol) => `allLiquidation.${symbol}`);

    const connectors: Record<LiquidationExchange, Connector> = {
      Binance: {
        url: "wss://fstream.binance.com/market/ws/!forceOrder@arr",
        subscribe: () => undefined,
        ping: null,
        parse: parseBinance,
      },
      Bybit: {
        url: "wss://stream.bybit.com/v5/public/linear",
        subscribe: (socket) => {
          for (let i = 0; i < bybitTopics.length; i += BYBIT_BATCH) {
            socket.send(JSON.stringify({ op: "subscribe", args: bybitTopics.slice(i, i + BYBIT_BATCH) }));
          }
        },
        ping: (socket) => socket.send(JSON.stringify({ op: "ping" })),
        parse: (data) => parseBybit(data, bybitSymbols),
      },
      OKX: {
        url: "wss://ws.okx.com/ws/v5/public",
        subscribe: (socket) => socket.send(JSON.stringify({ op: "subscribe", args: [{ channel: "liquidation-orders", instType: "SWAP" }] })),
        ping: (socket) => socket.send("ping"),
        parse: (data) => parseOkx(data, okxContractValues),
      },
    };

    const setStatus = (exchange: LiquidationExchange, status: FeedStatus) => {
      statusChanges[exchange] = status;
    };

    const stop = (exchange: LiquidationExchange) => {
      clearInterval(pings.get(exchange));
      clearTimeout(retries.get(exchange));
      pings.delete(exchange);
      retries.delete(exchange);
      const socket = sockets.get(exchange);
      sockets.delete(exchange);
      if (socket) {
        socket.onclose = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.close();
      }
    };

    const connect = (exchange: LiquidationExchange) => {
      if (disposed || paused) return;
      const connector = connectors[exchange];
      if (exchange === "Bybit" && !bybitTopics.length) {
        setStatus(exchange, "offline");
        return;
      }
      setStatus(exchange, "connecting");
      const socket = new WebSocket(connector.url);
      sockets.set(exchange, socket);
      socket.onopen = () => {
        attempts.set(exchange, 0);
        setStatus(exchange, "live");
        connector.subscribe(socket);
        if (connector.ping) {
          const ping = connector.ping;
          pings.set(
            exchange,
            setInterval(() => {
              if (socket.readyState === WebSocket.OPEN) ping(socket);
            }, PING_MS),
          );
        }
      };
      socket.onmessage = (message) => {
        if (typeof message.data !== "string" || message.data === "pong") return;
        let data: unknown;
        try {
          data = JSON.parse(message.data);
        } catch {
          return;
        }
        for (const item of connector.parse(data)) {
          if (item.time < startedAt - STALE_MS || seen.has(item.id)) continue;
          seen.add(item.id);
          pending.push(item);
        }
      };
      socket.onerror = () => socket.close();
      socket.onclose = () => {
        stop(exchange);
        if (disposed || paused) return;
        setStatus(exchange, "offline");
        const attempt = (attempts.get(exchange) ?? 0) + 1;
        attempts.set(exchange, attempt);
        retries.set(
          exchange,
          setTimeout(() => connect(exchange), Math.min(1000 * 2 ** (attempt - 1), MAX_BACKOFF_MS)),
        );
      };
    };

    const startAll = () => LIQUIDATION_EXCHANGES.forEach(connect);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        paused = true;
        LIQUIDATION_EXCHANGES.forEach((exchange) => {
          stop(exchange);
          setStatus(exchange, "paused");
        });
      } else if (paused) {
        paused = false;
        startAll();
      }
    };

    const flush = setInterval(() => {
      const changes = Object.entries(statusChanges) as [LiquidationExchange, FeedStatus][];
      if (!pending.length && !changes.length) return;
      const batch = pending.splice(0).sort((a, b) => b.time - a.time);
      for (const key of Object.keys(statusChanges)) delete statusChanges[key as LiquidationExchange];
      setSnapshot((prev) => {
        const session = { ...prev.session };
        const byExchange = { Binance: { ...prev.byExchange.Binance }, Bybit: { ...prev.byExchange.Bybit }, OKX: { ...prev.byExchange.OKX } };
        const byCoin = { ...prev.byCoin };
        let largest = prev.largest;
        for (const item of batch) {
          addToTally(session, item);
          addToTally(byExchange[item.exchange], item);
          byCoin[item.base] = { ...(byCoin[item.base] ?? emptyTally()) };
          addToTally(byCoin[item.base], item);
          if (!largest || item.usd > largest.usd) largest = item;
        }
        return {
          events: batch.length ? [...batch, ...prev.events].slice(0, MAX_EVENTS) : prev.events,
          session,
          byExchange,
          byCoin,
          largest,
          startedAt: prev.startedAt ?? startedAt,
          status: { ...prev.status, ...Object.fromEntries(changes) },
        };
      });
      if (seen.size > 5000) seen.clear();
    }, FLUSH_MS);

    document.addEventListener("visibilitychange", onVisibility);
    if (document.visibilityState === "hidden") onVisibility();
    else startAll();

    return () => {
      disposed = true;
      clearInterval(flush);
      document.removeEventListener("visibilitychange", onVisibility);
      LIQUIDATION_EXCHANGES.forEach(stop);
    };
  }, [okxContractValues, bybitSymbols]);

  return snapshot;
}
