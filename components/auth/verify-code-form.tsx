"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { InfoNote } from "@/components/auth/info-note";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { SuccessSheet } from "@/components/auth/success-sheet";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";
import { emailOtp, signIn } from "@/lib/auth-client";

const CODE_LENGTH = 6;

/** Verification code entry. Checks existing wallet status to route to /home or setup flow. */
export function VerifyCodeForm({
  nextHref,
  email,
}: {
  nextHref: string;
  email?: string;
}) {
  const code = usePinInput(CODE_LENGTH);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [targetActionHref, setTargetActionHref] = useState(
    nextHref || "/sign-up/pin",
  );
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const attemptedCodeRef = useRef<string | null>(null);

  useKeypadKeys({ ...code, enabled: !verifying && !verified });

  useEffect(() => {
    if (code.value.length < CODE_LENGTH) {
      attemptedCodeRef.current = null;
      if (error) setError(null);
    }
  }, [code.value, error]);

  const handleVerify = useCallback(
    async (otpValue: string) => {
      const targetEmail =
        email ||
        (typeof window !== "undefined"
          ? sessionStorage.getItem("onboardingEmail")
          : null);
      if (!targetEmail) {
        setError("Email address missing");
        return;
      }

      setVerifying(true);
      setError(null);

      try {
        const res = await signIn.emailOtp({
          email: targetEmail,
          otp: otpValue,
        });

        if (res.error) {
          console.warn("Verification failed:", res.error);
          setError(res.error.message || "Invalid verification code");
          setVerifying(false);
          return;
        }

        // Check if user already has an existing wallet
        try {
          const res = await fetch("/api/wallet/list");
          const wallets = await res.json();
          if (Array.isArray(wallets) && wallets.length > 0) {
            setTargetActionHref("/home");
          } else {
            setTargetActionHref("/sign-up/pin");
          }
        } catch {
          setTargetActionHref(nextHref || "/sign-up/pin");
        }

        setVerifying(false);
        setVerified(true);
      } catch (err) {
        console.error("Err during verification:", err);
        const msg = err instanceof Error ? err.message : "Verification failed";
        setError(msg);
        setVerifying(false);
      }
    },
    [email, nextHref],
  );

  useEffect(() => {
    if (
      code.complete &&
      !verifying &&
      !verified &&
      attemptedCodeRef.current !== code.value
    ) {
      attemptedCodeRef.current = code.value;
      handleVerify(code.value);
    }
  }, [code.complete, code.value, verifying, verified, handleVerify]);

  /** Clipboard read is blocked in some browsers, so it falls back to the callout. */
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

  const handleResend = async () => {
    const targetEmail =
      email ||
      (typeof window !== "undefined"
        ? sessionStorage.getItem("onboardingEmail")
        : null);
    if (!targetEmail || resending) return;

    setResending(true);
    setError(null);
    attemptedCodeRef.current = null;

    try {
      const res = await emailOtp.sendVerificationOtp({
        email: targetEmail,
        type: "sign-in",
      });

      if (res.error) {
        setError(res.error.message || "Could not resend code");
      } else {
        setError("New verification code sent!");
      }
    } catch {
      setError("Could not resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <div className="mt-8 flex flex-1 flex-col gap-6">
        <PinDisplay
          length={CODE_LENGTH}
          value={code.value}
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

        {error && (
          <p className="text-center text-xs text-jumpa-danger">{error}</p>
        )}

        {verifying && (
          <p className="text-center text-xs text-jumpa-neutral-500 animate-pulse">
            Verifying code...
          </p>
        )}

        <InfoNote>
          Didn't get Code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-semibold text-jumpa-primary-600 cursor-pointer disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend Code"}
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
          description="Your code has been verified successfully. You can now continue."
          actionHref={targetActionHref}
          actionLabel="Continue"
        />
      ) : null}
    </>
  );
}
