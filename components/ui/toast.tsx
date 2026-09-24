"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "@/components/ui/icons/check";
import { TriangleWarningIcon } from "@/components/ui/icons/triangle-warning";
import { cn } from "@/lib/cn";

const LIFETIME_MS = 3600;
/** Three is all the column has room for; the oldest drops off the top. */
const MAX_VISIBLE = 3;
/**
 * React runs an effect twice on mount under Strict Mode, which is on by default
 * in dev, so a receipt screen raised the same toast twice. The same message
 * inside this window is that second call, not a second transaction.
 */
const REPEAT_MS = 1500;

type Tone = "success" | "error";
type Entry = { id: number; tone: Tone; title: string; detail?: string };

const listeners = new Set<(entry: Entry) => void>();
let nextId = 0;
let lastKey = "";
let lastAt = 0;

function emit(tone: Tone, title: string, detail?: string) {
  const key = `${tone}|${title}|${detail ?? ""}`;
  const now = Date.now();
  if (key === lastKey && now - lastAt < REPEAT_MS) return;
  lastKey = key;
  lastAt = now;

  nextId += 1;
  const entry: Entry = { id: nextId, tone, title, detail };
  for (const listener of listeners) listener(entry);
}

/**
 * Fire and forget, so a flow reports an outcome without a context or a prop
 * threaded through it. `<Toaster />` in the app layout is the only subscriber;
 * with none mounted a call is a no-op rather than an error.
 */
export const toast = {
  success(title: string, detail?: string) {
    emit("success", title, detail);
  },
  error(title: string, detail?: string) {
    emit("error", title, detail);
  },
};

const TONE = {
  success: {
    Icon: CheckIcon,
    disc: "bg-jumpa-success/10 text-jumpa-success",
  },
  error: {
    Icon: TriangleWarningIcon,
    disc: "bg-jumpa-warning-50 text-jumpa-warning",
  },
} as const;

/**
 * The stack, mounted once in the app layout. Portalled to the body so it clears
 * every `relative isolate` canvas the transfer and savings screens set up.
 */
export function Toaster() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const push = (entry: Entry) =>
      setEntries((list) => [...list, entry].slice(-MAX_VISIBLE));
    listeners.add(push);
    return () => {
      listeners.delete(push);
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setEntries((list) => list.filter((entry) => entry.id !== id));
  }, []);

  if (!mounted || entries.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-70 flex justify-center px-4.5 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      {/* Narrower than the column and content-width: a toast is a notice, not a
          banner, so it should not read as full-bleed. */}
      <div className="flex max-w-80 flex-col items-center gap-2">
        {entries.map((entry) => (
          <ToastCard key={entry.id} entry={entry} onDismiss={dismiss} />
        ))}
      </div>
    </div>,
    document.body,
  );
}

function ToastCard({
  entry,
  onDismiss,
}: {
  entry: Entry;
  onDismiss: (id: number) => void;
}) {
  const { Icon, disc } = TONE[entry.tone];

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(entry.id), LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [entry.id, onDismiss]);

  return (
    // `output` carries `role="status"`, so the copy is announced without ARIA.
    <output className="pointer-events-auto animate-drop-in flex items-center gap-2.5 rounded-2xl bg-jumpa-white/95 px-3.5 py-2.5 shadow-jumpa-toast inset-ring-1 inset-ring-jumpa-neutral-100 backdrop-blur-sm">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          disc,
        )}
      >
        <Icon className="size-4" />
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs leading-4 font-semibold text-jumpa-black">
          {entry.title}
        </span>
        {entry.detail ? (
          <span className="text-[10px] leading-3.5 font-medium text-jumpa-neutral-425">
            {entry.detail}
          </span>
        ) : null}
      </span>
    </output>
  );
}
