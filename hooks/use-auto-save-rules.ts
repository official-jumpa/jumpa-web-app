import { useCallback, useEffect, useRef, useState } from "react";
import { useRefreshSignal } from "@/lib/refresh";
import {
  AUTO_SAVE_LIVE,
  type AutoSaveDraft,
  type AutoSaveRule,
} from "@/lib/savings-auto-save";

/** `wrongPin` keeps the PIN sheet open for another try instead of closing it. */
export type AutoSaveResult =
  | { ok: true }
  | { ok: false; message: string; wrongPin: boolean };

const ENDPOINT = "/api/v1/savings/auto-save";

/** Time the job gets to land a due run before we look; it runs every minute. */
const RUN_GRACE_MS = 15_000;
/** How often to look again while a due run has not landed yet. */
const OVERDUE_POLL_MS = 30_000;
/** Longest single wait, so a monthly rule never overflows `setTimeout`. */
const MAX_WAIT_MS = 60 * 60_000;

type RuleResponse = { rule?: AutoSaveRule; error?: string };

/** Sends one change and reads back the rule it left, or why it failed. */
async function send(
  method: "PUT" | "PATCH" | "DELETE",
  body: object,
): Promise<{ result: AutoSaveResult; rule?: AutoSaveRule }> {
  try {
    const res = await fetch(ENDPOINT, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: RuleResponse = await res.json().catch(() => ({}));
    if (res.ok) return { result: { ok: true }, rule: data.rule };
    const message = data.error || "Could not update auto-save";
    // A 423 is a locked wallet: retyping the PIN cannot help.
    const wrongPin = res.status === 401 && /pin/i.test(message);
    return { result: { ok: false, message, wrongPin } };
  } catch {
    return {
      result: {
        ok: false,
        message: "No connection. Check your internet and try again.",
        wrongPin: false,
      },
    };
  }
}

/** Changes whenever the job has run a rule, or ended one. */
const runSignature = (rules: AutoSaveRule[]) =>
  rules
    .map((rule) => `${rule.goalId}:${rule.lastRunAt ?? ""}`)
    .sort()
    .join("|");

/** Milliseconds until it is worth asking whether the next due run has landed. */
function waitForNextRun(rules: Record<string, AutoSaveRule>): number | null {
  const due = Object.values(rules)
    .filter((rule) => !rule.paused && rule.nextRunAt)
    .map((rule) => Date.parse(rule.nextRunAt as string));
  if (due.length === 0) return null;
  const wait = Math.min(...due) + RUN_GRACE_MS - Date.now();
  return wait > 0 ? Math.min(wait, MAX_WAIT_MS) : OVERDUE_POLL_MS;
}

/**
 * Every plan's auto-save rule and the three ways to change one.
 * While the page is visible it checks back just after each rule's next run,
 * and calls `onRun` when one has landed so the plans can be re-read.
 */
export function useAutoSaveRules({ onRun }: { onRun?: () => void } = {}) {
  const [rules, setRules] = useState<Record<string, AutoSaveRule>>({});
  const [visible, setVisible] = useState(true);
  /** Bumped after every check, so the next one is scheduled even when nothing changed. */
  const [checks, setChecks] = useState(0);
  const seenRuns = useRef<string | null>(null);
  const latestOnRun = useRef(onRun);
  const alive = useRef<AbortController | null>(null);

  useEffect(() => {
    latestOnRun.current = onRun;
  });

  const reload = useCallback(async () => {
    if (!AUTO_SAVE_LIVE) return;
    try {
      const res = await fetch(ENDPOINT, {
        cache: "no-store",
        signal: alive.current?.signal,
      });
      if (!res.ok) return;
      const { rules: list = [] }: { rules?: AutoSaveRule[] } = await res.json();
      const runs = runSignature(list);
      if (seenRuns.current !== null && runs !== seenRuns.current) {
        latestOnRun.current?.();
      }
      seenRuns.current = runs;
      setRules(Object.fromEntries(list.map((rule) => [rule.goalId, rule])));
    } catch {
      // Offline or unmounted: the next check or a refresh tries again.
    } finally {
      setChecks((count) => count + 1);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    alive.current = controller;
    reload();
    return () => controller.abort();
  }, [reload]);

  // Background tabs never poll; coming back catches up at once.
  useEffect(() => {
    const onVisibility = () => {
      const shown = document.visibilityState === "visible";
      setVisible(shown);
      if (shown) reload();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reload]);

  useRefreshSignal(reload);

  // `checks` re-arms the timer after each look, even when the rules came back the same.
  useEffect(() => {
    if (!visible || checks === 0) return;
    const wait = waitForNextRun(rules);
    if (wait === null) return;
    const timer = window.setTimeout(reload, wait);
    return () => window.clearTimeout(timer);
  }, [rules, visible, checks, reload]);

  const keep = useCallback((rule?: AutoSaveRule) => {
    if (rule) setRules((current) => ({ ...current, [rule.goalId]: rule }));
  }, []);

  /** Creates the plan's rule or replaces it. Saving always leaves it running. */
  const save = useCallback(
    async (goalId: string, draft: AutoSaveDraft, pin: string) => {
      const { result, rule } = await send("PUT", {
        ...draft,
        planId: goalId,
        pin,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      keep(rule);
      return result;
    },
    [keep],
  );

  const setPaused = useCallback(
    async (goalId: string, paused: boolean) => {
      const { result, rule } = await send("PATCH", { planId: goalId, paused });
      keep(rule);
      return result;
    },
    [keep],
  );

  const remove = useCallback(async (goalId: string) => {
    const { result } = await send("DELETE", { planId: goalId });
    if (result.ok) {
      setRules((current) => {
        const { [goalId]: _removed, ...rest } = current;
        return rest;
      });
    }
    return result;
  }, []);

  return { rules, reload, save, setPaused, remove };
}
