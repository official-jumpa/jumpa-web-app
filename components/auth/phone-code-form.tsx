"use client";

import { useEffect, useState } from "react";
import { InfoNote } from "@/components/auth/info-note";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { SuccessSheet } from "@/components/auth/success-sheet";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";

const CODE_LENGTH = 6;

/** Phone code entry, same shape as the email screen and the same success sheet. */
// TODO(backend): check the code against the SMS provider, and resend through it.
export function PhoneCodeForm({ nextHref }: { nextHref: string }) {
  const code = usePinInput(CODE_LENGTH);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useKeypadKeys({ ...code, enabled: !verifying && !verified });

  // Keyed on `complete` alone — setting `verifying` here would re-run the effect
  // and its cleanup would clear the timer before it fired.
  useEffect(() => {
    if (!code.complete) return;

    setVerifying(true);
    setError(null);
    // Stands in for the provider round trip, so the pending state is real.
    const timer = setTimeout(() => {
      setVerifying(false);
      setVerified(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [code.complete]);

  /** Clipboard reads are blocked in some browsers; fall back to the callout. */
  const handlePaste = async () => {
    try {
      const digits = (await navigator.clipboard.readText())
        .replace(/\D/g, "")
        .slice(0, CODE_LENGTH);
      if (!digits) {
        setError("No code found on the clipboard.");
        return;
      }
      setError(null);
      code.set(digits);
    } catch {
      setError("Long-press the code box and choose Paste.");
    }
  };

  return (
    <>
      <div className="mt-8 flex flex-1 flex-col gap-6">
        <PinDisplay
          length={CODE_LENGTH}
          value={code.value}
          label="Enter Code"
          reveal
          autoFocus
          onValueChange={code.set}
        />

        <button
          type="button"
          onClick={handlePaste}
          className="tap -mt-3 self-center text-xs font-semibold text-jumpa-primary-600 active:scale-95"
        >
          Paste code
        </button>

        {error ? (
          <p className="text-center text-xs text-jumpa-danger">{error}</p>
        ) : null}

        {verifying ? (
          <p className="animate-pulse text-center text-xs text-jumpa-neutral-500">
            Verifying code...
          </p>
        ) : null}

        <InfoNote>
          Didn't get Code?{" "}
          <button
            type="button"
            onClick={() => code.clear()}
            className="cursor-pointer font-semibold text-jumpa-primary-600"
          >
            Resend Code
          </button>
        </InfoNote>
      </div>

      <NumericKeypad
        onDigit={code.push}
        onBackspace={code.backspace}
        disabled={verifying || verified}
        className={KEYPAD_PANEL}
      />

      {verified ? (
        <SuccessSheet
          title="Verification successful"
          description="Your mobile number has been verified successfully. You can now continue."
          actionHref={nextHref}
          actionLabel="Continue"
        />
      ) : null}
    </>
  );
}
