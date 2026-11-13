"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;
const listeners = new Set<() => void>();
let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, MINUTE);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot() {
  return now || Date.now();
}

function getServerSnapshot() {
  return null;
}

function absolute(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function relative(date: Date, current: number) {
  const diff = Math.max(0, current - date.getTime());
  const minutes = Math.floor(diff / MINUTE);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : absolute(date);
}

export function RelativeTime({ iso }: { iso: string }) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const date = new Date(iso);
  return (
    <time dateTime={iso} title={date.toUTCString()}>
      {current === null ? absolute(date) : relative(date, current)}
    </time>
  );
}
