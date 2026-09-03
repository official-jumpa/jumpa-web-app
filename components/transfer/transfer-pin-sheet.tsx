"use client";

import { useEffect, useRef } from "react";
import { NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { SheetPortal } from "@/components/ui/sheet-portal";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";

const PIN_LENGTH = 6;

/**
 * Authorises a transfer. The title carries the error — the design shows
 * "Incorrect PIN" with the slots in red, not a separate screen.
 */
export function TransferPinSheet({
  length = PIN_LENGTH,
  error,
  onComplete,
  onRetry,
  onClose,
}: {
  length?: number;
  error?: boolean;
  /** Fires on the last digit; the caller decides what happens next. */
  onComplete: (pin: string) => void;
  /** Fires on the first keypress after a rejection, to clear `error`. */
  onRetry?: () => void;
  onClose: () => void;
}) {
  const pin = usePinInput(length);
  const submitted = useRef<string | null>(null);
  const rejected = useRef(false);

  useEffect(() => {
    if (pin.complete && submitted.current !== pin.value) {
      submitted.current = pin.value;
      onComplete(pin.value);
    }
  }, [pin.complete, pin.value, onComplete]);

  useEffect(() => {
    if (error) rejected.current = true;
  }, [error]);

  // The rejected PIN stays on screen in red; the next keypress starts it over.
  const restart = () => {
    if (!rejected.current) return false;
    rejected.current = false;
    submitted.current = null;
    pin.clear();
    onRetry?.();
    return true;
  };

  const push = (digit: string) => {
    restart();
    pin.push(digit);
  };

  const backspace = () => {
    if (!restart()) pin.backspace();
  };

  const set = (next: string) => {
    restart();
    pin.set(next);
  };

  useKeypadKeys({ push, backspace, set });

  return (
    <SheetPortal onClose={onClose} className="px-6 pt-6 pb-7.5">
      <h2
        className={`text-center text-base leading-4.5 font-semibold ${
          error ? "text-jumpa-danger" : "text-jumpa-black"
        }`}
      >
        {error ? "Incorrect PIN" : "Enter your PIN"}
      </h2>

      <div className="mt-4">
        <PinDisplay
          length={length}
          value={pin.value}
          tone="sheet"
          error={error}
          autoFocus
          onValueChange={set}
        />
      </div>

      <NumericKeypad onDigit={push} onBackspace={backspace} className="mt-5" />
    </SheetPortal>
  );
}
