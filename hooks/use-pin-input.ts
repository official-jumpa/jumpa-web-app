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

  return { value, push, backspace, clear, complete: value.length === length };
}
