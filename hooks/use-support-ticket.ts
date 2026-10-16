import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatAttachment } from "@/lib/chat-attachments";
import {
  pollInterval,
  type ReplyEstimate,
  type TicketCategory,
  type TicketMessage,
  type TicketThread,
  type TicketTransaction,
  type TicketView,
} from "@/lib/support-tickets";

/** One message on its way out. */
export interface SupportDraft {
  text: string;
  attachments: ChatAttachment[];
  transaction?: TicketTransaction | null;
  /** Only read when the message starts a conversation. */
  category?: TicketCategory | null;
}

/** A user message the server has not stored yet. */
export interface OutgoingMessage extends TicketMessage {
  delivery: "sending" | "failed";
  draft: SupportDraft;
}

type Phase = "new" | "loading" | "ready" | "missing";
type Busy = "escalate" | "rate" | null;

class SupportRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new SupportRequestError(
      typeof data?.error === "string"
        ? data.error
        : "Something went wrong. Try again.",
      res.status,
    );
  }
  return data as T;
}

function messageBody(draft: SupportDraft) {
  return {
    text: draft.text,
    attachments: draft.attachments,
    transactionId: draft.transaction?.id ?? null,
  };
}

/** Adds what a poll brought back; ids already held are replaced, never doubled. */
function mergeMessages(
  held: TicketMessage[],
  incoming: TicketMessage[],
): TicketMessage[] {
  if (!incoming.length) return held;
  const fresh = new Map(incoming.map((m) => [m.id, m]));
  const kept = held.map((m) => fresh.get(m.id) ?? m);
  const known = new Set(held.map((m) => m.id));
  return [...kept, ...incoming.filter((m) => !known.has(m.id))];
}

/**
 * One support conversation from the user's side: load, send, poll.
 * Polls only while a person holds it and the tab is visible.
 */
export function useSupportTicket(
  initialId: string | null,
  { onCreated }: { onCreated?: (ticketId: string) => void } = {},
) {
  const [phase, setPhase] = useState<Phase>(initialId ? "loading" : "new");
  const [ticket, setTicket] = useState<TicketView | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [outbox, setOutbox] = useState<OutgoingMessage[]>([]);
  const [estimate, setEstimate] = useState<ReplyEstimate | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const cursor = useRef<string | null>(null);
  const ticketRef = useRef<TicketView | null>(null);
  // Held in a ref so a new callback from the parent never restarts anything.
  const created = useRef(onCreated);
  useEffect(() => {
    created.current = onCreated;
  });
  // A create that answers after the user left must not rewrite another page's URL.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** A response that arrives late never rolls the ticket back. */
  const apply = useCallback((thread: TicketThread, merge: boolean) => {
    const held = ticketRef.current;
    if (
      held &&
      held.id === thread.ticket.id &&
      thread.ticket.updatedAt < held.updatedAt
    ) {
      setMessages((prev) => mergeMessages(prev, thread.messages));
      return;
    }
    ticketRef.current = thread.ticket;
    cursor.current = thread.cursor;
    setTicket(thread.ticket);
    setEstimate(thread.estimate);
    setMessages((prev) =>
      merge ? mergeMessages(prev, thread.messages) : thread.messages,
    );
    setPhase("ready");
  }, []);

  useEffect(() => {
    if (!initialId) return;
    let cancelled = false;
    call<TicketThread>(`/api/support/tickets/${encodeURIComponent(initialId)}`)
      .then((thread) => {
        if (!cancelled) apply(thread, false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof SupportRequestError && err.status === 404)
          setPhase("missing");
        else setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [initialId, apply]);

  const refresh = useCallback(async () => {
    const id = ticketRef.current?.id;
    if (!id) return;
    const since = cursor.current
      ? `?since=${encodeURIComponent(cursor.current)}`
      : "";
    try {
      apply(
        await call<TicketThread>(
          `/api/support/tickets/${encodeURIComponent(id)}${since}`,
        ),
        true,
      );
    } catch {
      // A missed poll is retried on the next tick.
    }
  }, [apply]);

  const id = ticket?.id;
  const every = ticket ? pollInterval(ticket.status) : null;

  useEffect(() => {
    if (!id || !every) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const schedule = () => {
      clearTimeout(timer);
      if (stopped || document.visibilityState !== "visible") return;
      timer = setTimeout(async () => {
        await refresh();
        schedule();
      }, every);
    };
    // Coming back to the tab catches up at once, then resumes the rhythm.
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        clearTimeout(timer);
        return;
      }
      refresh().then(schedule);
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [id, every, refresh]);

  const deliver = useCallback(
    async (local: OutgoingMessage) => {
      const held = ticketRef.current;
      try {
        if (held) {
          apply(
            await call<TicketThread>(
              `/api/support/tickets/${encodeURIComponent(held.id)}`,
              {
                action: "message",
                ...messageBody(local.draft),
              },
            ),
            false,
          );
        } else {
          const { ticketId, thread } = await call<{
            ticketId: string;
            thread: TicketThread;
          }>("/api/support/tickets", {
            ...messageBody(local.draft),
            category: local.draft.category ?? null,
          });
          apply(thread, false);
          if (mounted.current) created.current?.(ticketId);
        }
        setOutbox((prev) => prev.filter((m) => m.id !== local.id));
      } catch (err) {
        setOutbox((prev) =>
          prev.map((m) =>
            m.id === local.id ? { ...m, delivery: "failed" } : m,
          ),
        );
        // A network failure only marks the bubble; the server's own reason is worth saying.
        if (err instanceof SupportRequestError) setError(err.message);
      }
    },
    [apply],
  );

  const send = useCallback(
    (draft: SupportDraft) => {
      const local: OutgoingMessage = {
        id: `local-${crypto.randomUUID()}`,
        role: "user",
        content: draft.text,
        ...(draft.attachments.length ? { attachments: draft.attachments } : {}),
        ...(draft.transaction ? { transaction: draft.transaction } : {}),
        createdAt: new Date().toISOString(),
        delivery: "sending",
        draft,
      };
      setError(null);
      setOutbox((prev) => [...prev, local]);
      return deliver(local);
    },
    [deliver],
  );

  const retry = useCallback(
    (localId: string) => {
      const local = outbox.find((m) => m.id === localId);
      if (!local) return;
      setOutbox((prev) =>
        prev.map((m) => (m.id === localId ? { ...m, delivery: "sending" } : m)),
      );
      return deliver({ ...local, delivery: "sending" });
    },
    [outbox, deliver],
  );

  const discard = useCallback((localId: string) => {
    setOutbox((prev) => prev.filter((m) => m.id !== localId));
  }, []);

  const act = useCallback(
    async (kind: Exclude<Busy, null>, body: Record<string, unknown>) => {
      const held = ticketRef.current;
      if (!held) return false;
      setBusy(kind);
      setError(null);
      try {
        apply(
          await call<TicketThread>(
            `/api/support/tickets/${encodeURIComponent(held.id)}`,
            body,
          ),
          false,
        );
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Try again.",
        );
        return false;
      } finally {
        setBusy(null);
      }
    },
    [apply],
  );

  const escalate = useCallback(
    () => act("escalate", { action: "escalate" }),
    [act],
  );
  const rate = useCallback(
    (score: number, comment?: string) =>
      act("rate", { action: "rate", score, comment }),
    [act],
  );

  return {
    phase,
    ticket,
    messages,
    outbox,
    estimate,
    busy,
    error,
    clearError: () => setError(null),
    send,
    retry,
    discard,
    escalate,
    rate,
  };
}
