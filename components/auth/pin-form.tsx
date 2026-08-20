"use client";

import { InfoNote } from "@/components/auth/info-note";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { usePinInput } from "@/hooks/use-pin-input";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
        <PinDisplay length={PIN_LENGTH} value={pin.value} label={label} />
        <InfoNote>
          <span className="flex flex-col gap-2">
            <span className="font-medium">
              Passcode for your self-custodial wallet.
            </span>
            <span>
              A PIN is used to sign transactions and unlock your wallet on your
              device. It's never sent unencrypted to Jumpa servers.
            </span>
          </span>
        </InfoNote>
      </div>

      <NumericKeypad
        onDigit={pin.push}
        onBackspace={pin.backspace}
        className={KEYPAD_PANEL}
      />
    </>
  );
}
