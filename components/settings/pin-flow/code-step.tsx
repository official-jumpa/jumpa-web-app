"use client";

import { useEffect, useState } from "react";
import { PinDisplay } from "@/components/auth/pin-display";
import { Button } from "@/components/ui/button";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";
import { RESEND_SECONDS, RESET_CODE_LENGTH } from "@/lib/pin-flows";

/** `4:20s`, the form the design prints the countdown in. */
function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}s`;
}

/** The emailed reset code. Verified on Continue, not on the last digit. */
export function CodeStep({
  contact,
  error,
  checking,
  onSubmit,
  onResend,
  onEdit,
}: {
  contact: string;
  error?: string;
  checking?: boolean;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onEdit?: () => void;
}) {
  const code = usePinInput(RESET_CODE_LENGTH);
  const [remaining, setRemaining] = useState(RESEND_SECONDS);

  useKeypadKeys({ ...code, enabled: !checking });

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setInterval(
      () => setRemaining((left) => Math.max(0, left - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [remaining]);

  const resend = () => {
    setRemaining(RESEND_SECONDS);
    code.clear();
    onResend();
  };

  return (
    <div className="mt-8 flex flex-1 flex-col gap-6">
      <PinDisplay
        length={RESET_CODE_LENGTH}
        value={code.value}
        label="Enter your verification code"
        error={Boolean(error)}
        // A mailed code is read off the screen, so it is shown, not masked.
        reveal
        autoFocus
        onValueChange={(next) => {
          if (error) onEdit?.();
          code.set(next);
        }}
      />

      {error ? (
        <p role="alert" className="text-center text-xs text-jumpa-danger">
          {error}
        </p>
      ) : null}

      {remaining > 0 ? (
        <p className="text-center text-sm leading-4 font-medium text-jumpa-primary-600">
          Resend Code in {clock(remaining)}
        </p>
      ) : (
        <button
          type="button"
          onClick={resend}
          className="tap self-center text-sm leading-4 font-semibold text-jumpa-primary-600 active:scale-95"
        >
          Resend Code
        </button>
      )}

      <span className="sr-only">Code sent to {contact}</span>

      <Button
        variant="gradient"
        size="lg"
        disabled={!code.complete || checking}
        onClick={() => onSubmit(code.value)}
        className="mt-auto disabled:opacity-50"
      >
        {checking ? "Checking…" : "Continue"}
      </Button>
    </div>
  );
}
