"use client";

import { useEffect, useState } from "react";

export const FLOW_EXCHANGES = ["Binance", "Bybit", "OKX"] as const;
export type FlowExchange = (typeof FLOW_EXCHANGES)[number];
export type FlowStatus = "connecting" | "live" | "unavailable";

export interface ExchangeFlow {
  buyUsd: number;
  sellUsd: number;
  trades: number;
  status: FlowStatus;
}

export interface TakerFlow {
  since: number | null;
  updatedAt: number | null;
  exchanges: Record<FlowExchange, ExchangeFlow>;
}

const FLUSH_MS = 1000;
const PING_MS = 20_000;
const SUBSCRIBE_TIMEOUT_MS = 10_000;

function emptyFlow(): TakerFlow {
  const blank = (): ExchangeFlow => ({ buyUsd: 0, sellUsd: 0, trades: 0, status: "connecting" });
  return { since: null, updatedAt: null, exchanges: { Binance: blank(), Bybit: blank(), OKX: blank() } };
}

let contractValuesRequest: Promise<Record<string, number>> | null = null;

function loadOkxContractValues() {
  contractValuesRequest ??= fetch("/api/liquidations/setup")
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
    .then((body: { okxContractValues?: Record<string, number> }) => body.okxContractValues ?? {})
    .catch(() => {
      contractValuesRequest = null;
      return {};
    });
  return contractValuesRequest;
}

type Trade = { exchange: FlowExchange; usd: number; buy: boolean };

interface Source {
  exchange: FlowExchange;
  url: string;
  subscribe?: (socket: WebSocket) => void;
  ping?: (socket: WebSocket) => void;
  parse: (data: unknown) => Trade[] | "subscribed" | "rejected" | null;
}

export function useTakerFlow({ base, contract, enabled }: { base: string; contract: string; enabled: boolean }) {
  const [flow, setFlow] = useState<TakerFlow>(emptyFlow);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    const pending: Trade[] = [];
    const statuses: Partial<Record<FlowExchange, FlowStatus>> = {};
    const sockets: WebSocket[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];
    const since = Date.now();

    const open = (source: Source) => {
      if (disposed) return;
      const socket = new WebSocket(source.url);
      sockets.push(socket);
      let confirmed = !source.subscribe;
      socket.onopen = () => {
        if (source.subscribe) source.subscribe(socket);
        else statuses[source.exchange] = "live";
        if (source.ping) {
          const ping = source.ping;
          intervals.push(setInterval(() => socket.readyState === WebSocket.OPEN && ping(socket), PING_MS));
        }
        timers.push(
          setTimeout(() => {
            if (!confirmed) {
              statuses[source.exchange] = "unavailable";
              socket.close();
            }
          }, SUBSCRIBE_TIMEOUT_MS),
        );
      };
      socket.onmessage = (message) => {
        if (typeof message.data !== "string" || message.data === "pong") return;
        let data: unknown;
        try {
          data = JSON.parse(message.data);
        } catch {
          return;
        }
        const result = source.parse(data);
        if (result === "subscribed") {
          confirmed = true;
          statuses[source.exchange] = "live";
        } else if (result === "rejected") {
          statuses[source.exchange] = "unavailable";
          socket.close();
        } else if (result?.length) {
          confirmed = true;
          statuses[source.exchange] = "live";
          pending.push(...result);
        }
      };
      socket.onerror = () => {
        statuses[source.exchange] = "unavailable";
      };
    };

    open({
      exchange: "Binance",
      url: `wss://fstream.binance.com/market/ws/${contract.toLowerCase()}@aggTrade`,
      parse: (data) => {
        const t = data as { e?: string; p?: string; q?: string; m?: boolean };
        if (t.e !== "aggTrade") return null;
        return [{ exchange: "Binance", usd: Number(t.p) * Number(t.q), buy: t.m === false }];
      },
    });

    open({
      exchange: "Bybit",
      url: "wss://stream.bybit.com/v5/public/linear",
      subscribe: (socket) => socket.send(JSON.stringify({ op: "subscribe", args: [`publicTrade.${contract}`] })),
      ping: (socket) => socket.send(JSON.stringify({ op: "ping" })),
      parse: (data) => {
        const msg = data as { op?: string; success?: boolean; topic?: string; data?: { S: string; v: string; p: string }[] };
        if (msg.op === "subscribe") return msg.success ? "subscribed" : "rejected";
        if (!msg.topic?.startsWith("publicTrade.") || !Array.isArray(msg.data)) return null;
        return msg.data.map((t) => ({ exchange: "Bybit" as const, usd: Number(t.v) * Number(t.p), buy: t.S === "Buy" }));
      },
    });

    loadOkxContractValues().then((values) => {
      const ctVal = values[base];
      if (disposed) return;
      if (!ctVal) {
        statuses.OKX = "unavailable";
        return;
      }
      open({
        exchange: "OKX",
        url: "wss://ws.okx.com/ws/v5/public",
        subscribe: (socket) => socket.send(JSON.stringify({ op: "subscribe", args: [{ channel: "trades", instId: `${base}-USDT-SWAP` }] })),
        ping: (socket) => socket.send("ping"),
        parse: (data) => {
          const msg = data as { event?: string; arg?: { channel?: string }; data?: { px: string; sz: string; side: string }[] };
          if (msg.event === "subscribe") return "subscribed";
          if (msg.event === "error") return "rejected";
          if (msg.arg?.channel !== "trades" || !Array.isArray(msg.data)) return null;
          return msg.data.map((t) => ({ exchange: "OKX" as const, usd: Number(t.sz) * ctVal * Number(t.px), buy: t.side === "buy" }));
        },
      });
    });

    const flush = setInterval(() => {
      const changes = Object.entries(statuses) as [FlowExchange, FlowStatus][];
      if (!pending.length && !changes.length) return;
      const batch = pending.splice(0);
      for (const key of Object.keys(statuses)) delete statuses[key as FlowExchange];
      setFlow((prev) => {
        const exchanges = { ...prev.exchanges };
        for (const [exchange, status] of changes) exchanges[exchange] = { ...exchanges[exchange], status };
        for (const trade of batch) {
          if (!Number.isFinite(trade.usd) || trade.usd <= 0) continue;
          const current = { ...exchanges[trade.exchange] };
          if (trade.buy) current.buyUsd += trade.usd;
          else current.sellUsd += trade.usd;
          current.trades += 1;
          exchanges[trade.exchange] = current;
        }
        return { since: prev.since ?? since, updatedAt: Date.now(), exchanges };
      });
    }, FLUSH_MS);

    return () => {
      disposed = true;
      clearInterval(flush);
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      sockets.forEach((socket) => {
        socket.onmessage = null;
        socket.onerror = null;
        socket.close();
      });
      setFlow(emptyFlow());
    };
  }, [base, contract, enabled]);

  return flow;
}
