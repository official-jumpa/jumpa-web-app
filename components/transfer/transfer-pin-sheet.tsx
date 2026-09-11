"use client";

import { useEffect, useRef } from "react";
import { NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { SheetPortal } from "@/components/ui/sheet-portal";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";

const PIN_LENGTH = 4;

/** Stable, so the sheet's Escape listener is not rebound on every render. */
const NOOP = () => {};

/**
 * Authorises a transfer. The title carries the error — the design shows
 * "Incorrect PIN" with the slots in red, not a separate screen. Once the last
 * digit is in, `pending` turns the sheet into a progress state that cannot be
 * dismissed, so nobody walks away from a transaction mid-flight.
 */
export function TransferPinSheet({
  length = PIN_LENGTH,
  error,
  pending,
  pendingLabel = "Processing your transaction",
  onComplete,
  onRetry,
  onClose,
}: {
  length?: number;
  error?: boolean;
  /** The transaction is in flight: pad locked, progress shown, no way out. */
  pending?: boolean;
  pendingLabel?: string;
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

  useKeypadKeys({ push, backspace, set, enabled: !pending });

  const title = pending
    ? pendingLabel
    : error
      ? "Incorrect PIN"
      : "Enter your PIN";

  return (
    <SheetPortal
      onClose={pending ? NOOP : onClose}
      className="px-6 pt-6 pb-7.5"
    >
      <h2
        className={`text-center text-base leading-4.5 font-semibold ${
          error && !pending ? "text-jumpa-danger" : "text-jumpa-black"
        }`}
      >
        {title}
      </h2>

      <div className="mt-4">
        <PinDisplay
          length={length}
          value={pin.value}
          tone="sheet"
          error={error && !pending}
          autoFocus={!pending}
          onValueChange={set}
        />
      </div>

      {pending ? <PinProgress /> : null}

      <NumericKeypad
        onDigit={push}
        onBackspace={backspace}
        disabled={pending}
        className="mt-5"
      />
    </SheetPortal>
  );
}

/** Indeterminate, because nothing here knows how long the chain will take. */
function PinProgress() {
  return (
    <output className="mt-4 flex flex-col items-center gap-2.5">
      <span className="block h-1 w-full overflow-hidden rounded-pill bg-jumpa-primary-50">
        <span className="progress-band block h-full w-1/3 animate-progress rounded-pill bg-jumpa-primary-600" />
      </span>
      <p className="text-center text-xs leading-4 text-jumpa-neutral-700">
        This takes a few seconds. Please keep this screen open.
      </p>
    </output>
  );
}
