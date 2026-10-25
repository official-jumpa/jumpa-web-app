"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { PIN_NOTES, PinNote } from "@/components/auth/pin-note";
import { PinLoaderSlot } from "@/components/ui/pin-loader";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";

const PIN_LENGTH = 4;

export function ConfirmPinForm({
  nextHref = "/sign-up/done",
}: {
  nextHref?: string;
}) {
  const pin = usePinInput(PIN_LENGTH);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  useKeypadKeys({ ...pin, enabled: status === "idle" });

  useEffect(() => {
    if (pin.complete && status === "idle") {
      handleConfirmPin(pin.value);
    }
  }, [pin.complete, status, pin.value]);

  const handleConfirmPin = async (confirmValue: string) => {
    const initialPin =
      typeof window !== "undefined" ? sessionStorage.getItem("setupPin") : null;

    if (initialPin && initialPin !== confirmValue) {
      setError("PIN does not match. Please try again.");
      pin.clear();
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/v1/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: confirmValue,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Wallet setup failed. Please try again.");
        setStatus("error");
        pin.clear();
        setTimeout(() => setStatus("idle"), 1000);
        return;
      }

      if (typeof window !== "undefined") {
        const address = data.data?.address || data.address;
        if (address) {
          sessionStorage.setItem("userWalletAddress", address);
        }
        sessionStorage.removeItem("setupPin");
      }

      setStatus("success");
      router.replace(nextHref);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Wallet setup failed";
      setError(msg);
      setStatus("error");
      pin.clear();
      setTimeout(() => setStatus("idle"), 1000);
    }
  };

  const creating = status === "submitting";

  return (
    <>
      <div className="mt-8 flex flex-1 flex-col gap-8">
        <PinDisplay
          length={PIN_LENGTH}
          value={pin.value}
          label="Enter pin again"
          autoFocus
          onValueChange={pin.set}
        />

        {error && (
          <p className="text-center text-xs text-jumpa-danger">{error}</p>
        )}

        <PinLoaderSlot busy={creating} label="Creating your secure wallet">
          <PinNote note={PIN_NOTES.confirm} />
        </PinLoaderSlot>
      </div>

      <NumericKeypad
        onDigit={pin.push}
        onBackspace={pin.backspace}
        disabled={status !== "idle"}
        className={KEYPAD_PANEL}
      />
    </>
  );
}
