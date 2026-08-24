"use client";

import { useCallback, useState } from "react";

/** Fixed-length numeric entry shared by the verification code and PIN screens. */
export function usePinInput(length: number) {
  const [value, setValue] = useState("");

  const push = useCallback(
    (digit: string) => setValue((v) => (v.length < length ? v + digit : v)),
    [length],
  );

  const backspace = useCallback(() => setValue((v) => v.slice(0, -1)), []);
  const clear = useCallback(() => setValue(""), []);

  /** Whole-value entry — typing, autofill, or a pasted code with spaces or dashes in it. */
  const set = useCallback(
    (next: string) => setValue(next.replace(/\D/g, "").slice(0, length)),
    [length],
  );

  return {
    value,
    push,
    backspace,
    clear,
    set,
    complete: value.length === length,
  };
}
