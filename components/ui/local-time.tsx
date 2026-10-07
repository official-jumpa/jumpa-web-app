"use client";

import { useSyncExternalStore } from "react";
import { formatClock } from "@/lib/chat";
import { formatNotificationTime } from "@/lib/notifications";
import { formatTxDate } from "@/lib/wallet";

const FORMAT = {
  clock: formatClock,
  notification: formatNotificationTime,
  history: formatTxDate,
} as const;

const subscribe = () => () => {};

/**
 * A moment in the viewer's own time zone. The server runs in UTC, so anything
 * it renders is an hour behind Lagos; this shows the server's text through
 * hydration, then re-renders on the device's clock.
 */
export function LocalTime({
  at,
  fallback = "",
  format,
  className,
}: {
  at?: string | number | Date;
  /** What the server rendered, shown until hydration and when `at` is missing. */
  fallback?: string;
  format: keyof typeof FORMAT;
  className?: string;
}) {
  const client = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const date = at === undefined ? null : new Date(at);
  const valid = date !== null && !Number.isNaN(date.getTime());

  return (
    <time
      dateTime={valid ? date.toISOString() : undefined}
      className={className}
    >
      {client && valid ? FORMAT[format](date) : fallback}
    </time>
  );
}
