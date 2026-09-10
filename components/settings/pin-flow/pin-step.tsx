"use client";

import { useEffect, useRef } from "react";
import { InfoNote } from "@/components/auth/info-note";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";
import type { PinFlow } from "@/lib/pin-flows";

/**
 * One PIN box and the pad under it. Submits on the last digit — every screen in
 * these flows has the pad as its only control, so there is no CTA to press.
 */
export function PinStep({
  label,
  length,
  note,
  error,
  busy,
  onSubmit,
  onEdit,
}: {
  label: string;
  length: number;
  note?: PinFlow["note"];
  /** A rejected entry stays on screen in red until the next keypress. */
  error?: string;
  busy?: boolean;
  onSubmit: (pin: string) => void;
  /** Fires on the first keypress after a rejection, so the caller clears `error`. */
  onEdit?: () => void;
}) {
  const pin = usePinInput(length);
  const submitted = useRef<string | null>(null);
  const rejected = useRef(false);

  useKeypadKeys({ ...pin, enabled: !busy });

  useEffect(() => {
    if (error) rejected.current = true;
  }, [error]);

  useEffect(() => {
    if (busy) return;
    if (pin.complete && submitted.current !== pin.value) {
      submitted.current = pin.value;
      onSubmit(pin.value);
    }
  }, [pin.complete, pin.value, busy, onSubmit]);

  /** Starting over after a rejection, rather than editing the red entry. */
  const restart = () => {
    if (!rejected.current) return false;
    rejected.current = false;
    submitted.current = null;
    pin.clear();
    onEdit?.();
    return true;
  };

  return (
    <>
      <div className="mt-8 flex flex-1 flex-col gap-6">
        <PinDisplay
          length={length}
          value={pin.value}
          label={label}
          error={Boolean(error)}
          autoFocus
          onValueChange={(next) => {
            if (restart()) return;
            pin.set(next);
          }}
        />

        {error ? (
          <p role="alert" className="text-center text-xs text-jumpa-danger">
            {error}
          </p>
        ) : null}

        {note ? (
          <InfoNote tone="danger">
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{note.heading}</span>
              <span>{note.body}</span>
            </span>
          </InfoNote>
        ) : null}
      </div>

      <NumericKeypad
        disabled={busy}
        onDigit={(digit) => {
          if (restart()) return;
          pin.push(digit);
        }}
        onBackspace={() => {
          if (restart()) return;
          pin.backspace();
        }}
        className={KEYPAD_PANEL}
      />
    </>
  );
}
