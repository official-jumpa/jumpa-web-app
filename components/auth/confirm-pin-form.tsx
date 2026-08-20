"use client";

import { InfoNote } from "@/components/auth/info-note";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { usePinInput } from "@/hooks/use-pin-input";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PIN_LENGTH = 6;

export function ConfirmPinForm({
  nextHref = "/sign-up/done",
}: {
  nextHref?: string;
}) {
  const pin = usePinInput(PIN_LENGTH);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (pin.complete && !creating) {
      handleConfirmPin(pin.value);
    }
  }, [pin.complete, creating, pin.value]);

  const handleConfirmPin = async (confirmValue: string) => {
    const initialPin =
      typeof window !== "undefined" ? sessionStorage.getItem("setupPin") : null;

    if (initialPin && initialPin !== confirmValue) {
      setError("PIN does not match. Please try again.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const phrase =
        typeof window !== "undefined"
          ? sessionStorage.getItem("setupPhrase") || undefined
          : undefined;

      const res = await fetch("/api/auth/wallet-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: confirmValue, phrase }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Wallet setup failed. Please try again.");
        setCreating(false);
        return;
      }

      if (typeof window !== "undefined" && data.address) {
        sessionStorage.setItem("userWalletAddress", data.address);
      }

      setCreating(false);
      router.push(nextHref);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Wallet setup failed";
      setError(msg);
      setCreating(false);
    }
  };

  return (
    <>
      <div className="mt-8 flex flex-1 flex-col gap-8">
        <PinDisplay
          length={PIN_LENGTH}
          value={pin.value}
          label="Enter pin again"
        />

        {error && (
          <p className="text-center text-xs text-jumpa-danger">{error}</p>
        )}

        {creating && (
          <p className="text-center text-xs text-jumpa-neutral-500 animate-pulse">
            Creating your secure wallet...
          </p>
        )}

        <InfoNote>
          Re-enter your 6-digit PIN to confirm and complete setting up your
          wallet
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
