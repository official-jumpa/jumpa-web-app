"use client";

import { useEffect, useRef } from "react";
import { NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";

const PIN_LENGTH = 6;

/** Transaction PIN, raised by Confirm. Closes itself once six digits are in. */
export function PinSheet({
  onClose,
  onComplete,
  error,
  processing,
}: {
  onClose: () => void;
  onComplete: (pin: string) => void;
  error?: string | null;
  processing?: boolean;
}) {
  const pin = usePinInput(PIN_LENGTH);
  const submittedPinRef = useRef<string | null>(null);

  useKeypadKeys({ ...pin, enabled: !processing });

  // Trigger completion once exactly 6 digits are typed
  useEffect(() => {
    if (pin.complete && !processing && submittedPinRef.current !== pin.value) {
      submittedPinRef.current = pin.value;
      onComplete(pin.value);
    }
  }, [pin.complete, pin.value, onComplete, processing]);

  // If an error is returned from the server, clear input and reset submission tracker
  useEffect(() => {
    if (error) {
      submittedPinRef.current = null;
      pin.clear();
    }
  }, [error]);

  return (
    <div className="fixed inset-0 z-40 mx-auto max-w-app">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={processing ? undefined : onClose}
        disabled={processing}
        className="absolute inset-0 animate-fade bg-jumpa-black/40 backdrop-blur-xs cursor-default"
      />

      <div className="absolute inset-x-2.5 bottom-[calc(env(safe-area-inset-bottom)+10px)] animate-sheet-up rounded-sheet border border-jumpa-black/4 bg-jumpa-white px-6 pt-6 pb-7.5 shadow-2xl z-50">
        <h2 className="text-center text-base leading-4.5 font-semibold text-jumpa-black">
          {processing ? "Processing your transaction" : "Enter your PIN"}
        </h2>

        {error && (
          <p className="mt-2 text-center text-xs font-medium text-jumpa-danger">
            {error}
          </p>
        )}

        {processing && (
          // Indeterminate: nothing here knows how long the chain will take.
          <output className="mt-4 flex flex-col items-center gap-2.5">
            <span className="block h-1 w-full overflow-hidden rounded-pill bg-jumpa-primary-50">
              <span className="progress-band block h-full w-1/3 animate-progress rounded-pill bg-jumpa-primary-600" />
            </span>
            <p className="text-center text-xs leading-4 text-jumpa-neutral-700">
              This takes a few seconds. Please keep this screen open.
            </p>
          </output>
        )}

        <div className="mt-4">
          <PinDisplay
            length={PIN_LENGTH}
            value={pin.value}
            tone="sheet"
            autoFocus
            onValueChange={pin.set}
          />
        </div>

        <NumericKeypad
          onDigit={pin.push}
          onBackspace={pin.backspace}
          disabled={processing}
          className="mt-5"
        />
      </div>
    </div>
  );
}
