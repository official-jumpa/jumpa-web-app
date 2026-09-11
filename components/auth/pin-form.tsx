"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { PinNote } from "@/components/auth/pin-note";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";

const PIN_LENGTH = 6;

/** Transaction PIN entry. Advances on its own once six digits are in. */
export function PinForm({
  label,
  nextHref,
}: {
  label: string;
  nextHref: string;
}) {
  const pin = usePinInput(PIN_LENGTH);
  const router = useRouter();

  useKeypadKeys(pin);

  useEffect(() => {
    if (pin.complete) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("setupPin", pin.value);
      }
      router.push(nextHref);
    }
  }, [pin.complete, nextHref, router, pin.value]);

  return (
    <>
      <div className="mt-8 flex flex-1 flex-col gap-8">
        <PinDisplay
          length={PIN_LENGTH}
          value={pin.value}
          label={label}
          autoFocus
          onValueChange={pin.set}
        />
        <PinNote />
      </div>

      <NumericKeypad
        onDigit={pin.push}
        onBackspace={pin.backspace}
        className={KEYPAD_PANEL}
      />
    </>
  );
}
