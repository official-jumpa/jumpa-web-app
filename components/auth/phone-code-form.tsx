"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { InfoNote } from "@/components/auth/info-note";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { SuccessSheet } from "@/components/auth/success-sheet";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";
import { readSignUpValue, writeSignUpValue, SIGN_UP_KEYS } from "@/lib/sign-up";

const CODE_LENGTH = 6;

/** Phone code entry. Verifies OTP against Myaza Trust via /api/auth/verify-phone. */
export function PhoneCodeForm({
  nextHref,
  phone,
}: {
  nextHref: string;
  phone?: string;
}) {
  const code = usePinInput(CODE_LENGTH);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resolvedHref, setResolvedHref] = useState<string>(nextHref);
  const [error, setError] = useState<string | null>(null);
  const attemptedCodeRef = useRef<string | null>(null);

  useKeypadKeys({ ...code, enabled: !verifying && !verified });

  useEffect(() => {
    if (code.value.length < CODE_LENGTH) {
      attemptedCodeRef.current = null;
      if (error && !error.includes("sent")) setError(null);
    }
  }, [code.value, error]);

  const handleVerify = useCallback(
    async (otpValue: string) => {
      const targetPhone = phone || readSignUpValue(SIGN_UP_KEYS.phone);
      const challengeId = readSignUpValue(SIGN_UP_KEYS.phoneChallengeId);

      if (!targetPhone) {
        setError("Phone number not found. Please go back and enter your number.");
        return;
      }

      if (!challengeId) {
        setError("Verification session expired. Please request a new code.");
        return;
      }

      setVerifying(true);
      setError(null);

      try {
        const res = await fetch("/api/auth/verify-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify",
            phone: targetPhone,
            code: otpValue,
            challengeId,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.verified) {
          console.warn("[PhoneCodeForm] Verification failed:", data);
          setError(data.error || "Invalid verification code");
          setVerifying(false);
          return;
        }

        try {
          const setupRes = await fetch("/api/auth/wallet-setup");
          if (setupRes.ok) {
            const setupData = await setupRes.json();
            if (setupData.nextRoute) {
              setResolvedHref(setupData.nextRoute);
            }
          }
        } catch (e) {
          console.warn("[PhoneCodeForm] Could not fetch nextRoute:", e);
        }

        setVerifying(false);
        setVerified(true);
      } catch (err: any) {
        console.error("[PhoneCodeForm] Verification error:", err);
        setError(err?.message || "Verification failed. Please try again.");
        setVerifying(false);
      }
    },
    [phone],
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

  const handleResend = async () => {
    const targetPhone = phone || readSignUpValue(SIGN_UP_KEYS.phone);
    if (!targetPhone || resending) return;

    setResending(true);
    setError(null);
    attemptedCodeRef.current = null;

    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone: targetPhone }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Could not resend code");
      } else {
        if (data.challengeId) {
          writeSignUpValue(SIGN_UP_KEYS.phoneChallengeId, data.challengeId);
        }
        setError("New verification code sent!");
      }
    } catch {
      setError("Could not resend code. Please try again later.");
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
          <p
            className={`text-center text-xs ${
              error.includes("sent")
                ? "text-jumpa-primary-600"
                : "text-jumpa-danger"
            }`}
          >
            {error}
          </p>
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
            onClick={handleResend}
            disabled={resending || verifying}
            className="cursor-pointer font-semibold text-jumpa-primary-600 disabled:opacity-50"
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
          description="Your mobile number has been verified successfully. You can now continue."
          actionHref={resolvedHref}
          actionLabel="Continue"
        />
      ) : null}
    </>
  );
}
