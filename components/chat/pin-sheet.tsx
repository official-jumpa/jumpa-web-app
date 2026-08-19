import { useEffect } from "react";
import { NumericKeypad } from "@/components/auth/numeric-keypad";
import { usePinInput } from "@/hooks/use-pin-input";

const PIN_LENGTH = 4;

/** Transaction PIN, raised by Confirm. Closes itself once four digits are in. */
export function PinSheet({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const pin = usePinInput(PIN_LENGTH);

  useEffect(() => {
    if (pin.complete) onComplete();
  }, [pin.complete, onComplete]);

  return (
    <div className="fixed inset-0 z-30 mx-auto max-w-[430px]">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="absolute inset-x-2.5 bottom-[calc(env(safe-area-inset-bottom)+10px)] rounded-sheet border border-jumpa-black/4 bg-jumpa-white px-6 pt-6 pb-7.5">
        <h2 className="text-center text-base leading-4.5 font-semibold text-jumpa-black">
          Enter your PIN
        </h2>

        <div className="mt-6 flex h-25 items-center justify-center gap-5 rounded-key border border-jumpa-neutral-275/10">
          {Array.from({ length: PIN_LENGTH }, (_, slot) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: slots never reorder
              key={slot}
              className="flex h-10 w-12 flex-col justify-end"
            >
              <span className="mb-3.5 text-center font-numeric text-4xl leading-[0] text-jumpa-black">
                {slot < pin.value.length ? "*" : ""}
              </span>
              <span className="h-1 w-full rounded-full bg-jumpa-pin-rule" />
            </span>
          ))}
        </div>

        <NumericKeypad
          onDigit={pin.push}
          onBackspace={pin.backspace}
          className="mt-6.25"
        />
      </div>
    </div>
  );
}
