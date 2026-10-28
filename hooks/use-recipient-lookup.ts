import { useEffect, useState } from "react";
import type { JumpaRecipient } from "@/lib/jumpa-send";

export type LookupStatus = "idle" | "searching" | "found" | "none" | "error";

const DEBOUNCE_MS = 400;
/** Shorter than any tag, email, phone or address, so it cannot match. */
const MIN_QUERY = 3;

/** Resolves what is typed in the recipient field to a Jumpa user, debounced. */
export function useRecipientLookup(query: string) {
  const [state, setState] = useState<{
    status: LookupStatus;
    recipient: JumpaRecipient | null;
    for: string;
  }>({ status: "idle", recipient: null, for: "" });

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/user/lookup?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const json = await res.json().catch(() => null);
        if (res.ok && json?.data) {
          setState({ status: "found", recipient: json.data, for: trimmed });
        } else {
          setState({
            status: res.status === 404 || res.status === 400 ? "none" : "error",
            recipient: null,
            for: trimmed,
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState({ status: "error", recipient: null, for: trimmed });
        }
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  // Derived, so an answer for an older query never shows against a newer one.
  if (trimmed.length < MIN_QUERY) return { status: "idle" as const, recipient: null };
  if (state.for !== trimmed) return { status: "searching" as const, recipient: null };
  return { status: state.status, recipient: state.recipient };
}
