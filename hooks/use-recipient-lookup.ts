import { useEffect, useState } from "react";
import type { JumpaRecipient } from "@/lib/jumpa-send";

export type LookupStatus = "idle" | "searching" | "found" | "none" | "error";

const DEBOUNCE_MS = 400;
/** Suggestions start from the third character. */
const MIN_QUERY = 3;

/** Resolves what is typed in the recipient field to matching Jumpa users, debounced. */
export function useRecipientLookup(query: string) {
  const [state, setState] = useState<{
    status: LookupStatus;
    recipients: JumpaRecipient[];
    for: string;
  }>({ status: "idle", recipients: [], for: "" });

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
        if (res.ok && Array.isArray(json?.data) && json.data.length > 0) {
          setState({ status: "found", recipients: json.data, for: trimmed });
        } else {
          setState({
            status: res.status === 404 || res.status === 400 ? "none" : "error",
            recipients: [],
            for: trimmed,
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState({ status: "error", recipients: [], for: trimmed });
        }
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  // Derived, so an answer for an older query never shows against a newer one.
  if (trimmed.length < MIN_QUERY) return { status: "idle" as const, recipients: [] };
  if (state.for !== trimmed) return { status: "searching" as const, recipients: [] };
  return { status: state.status, recipients: state.recipients };
}
