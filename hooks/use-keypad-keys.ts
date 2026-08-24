// No "use client": the directive makes Next's TS plugin read the options as props.
import { useEffect } from "react";

/** Physical keyboard for the on-screen pad. Window-level, so nothing needs focus. */
export function useKeypadKeys({
  push,
  backspace,
  set,
  enabled = true,
}: {
  push: (digit: string) => void;
  backspace: () => void;
  set?: (next: string) => void;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;

    const inField = (target: EventTarget | null) =>
      target instanceof Element &&
      target.closest("input, textarea, select, [contenteditable]") !== null;

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (inField(event.target)) return;

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        push(event.key);
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        backspace();
      }
    };

    const onPaste = (event: ClipboardEvent) => {
      if (!set || inField(event.target)) return;
      const text = event.clipboardData?.getData("text") ?? "";
      if (!/\d/.test(text)) return;
      event.preventDefault();
      set(text);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [push, backspace, set, enabled]);
}
