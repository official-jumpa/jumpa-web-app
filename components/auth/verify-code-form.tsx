"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InfoNote } from "@/components/auth/info-note";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { SuccessSheet } from "@/components/auth/success-sheet";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";
import { emailOtp, signIn } from "@/lib/auth-client";
import { clearSignUpEmail, readSignUpEmail, SIGN_UP_FLOW } from "@/lib/sign-up";

const CODE_LENGTH = 6;

/** Whatever the provider throws, the screen says what to do about it. */
function friendlyCodeError(raw: unknown) {
  const text = String(
    raw instanceof Error ? raw.message : (raw ?? ""),
  ).toLowerCase();
  if (/expired|no longer valid/.test(text))
    return "That code has expired. Tap Resend Code for a new one.";
  if (/too many|attempt|rate limit|throttl/.test(text))
    return "Too many tries. Wait a moment, then request a new code.";
  if (/invalid|incorrect|wrong|mismatch|not match/.test(text))
    return "That code isn't right. Check the 6 digits and try again.";
  if (/network|fetch|offline|connection/.test(text))
    return "No connection. Check your internet and try again.";
  return "We couldn't verify that code. Tap Resend Code and try again.";
}

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
    nextHref || SIGN_UP_FLOW.phone,
  );
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  /** The address we're verifying is gone, so there is nothing to check against. */
  const [lostEmail, setLostEmail] = useState(false);
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
      const targetEmail = email || readSignUpEmail();
      if (!targetEmail) {
        setLostEmail(true);
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
          setError(friendlyCodeError(res.error.message ?? res.error));
          setVerifying(false);
          return;
        }

        // The address has done its job; don't leave it on the device.
        clearSignUpEmail();

        // Resolve user onboarding / destination route
        try {
          const res = await fetch("/api/auth/wallet-setup");
          if (res.ok) {
            const data = await res.json();
            setTargetActionHref(data.nextRoute || SIGN_UP_FLOW.phone);
          } else {
            setTargetActionHref(SIGN_UP_FLOW.phone);
          }
        } catch {
          setTargetActionHref(nextHref || SIGN_UP_FLOW.phone);
        }

        setVerifying(false);
        setVerified(true);
      } catch (err) {
        console.error("Err during verification:", err);
        setError(friendlyCodeError(err));
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
    if (resending) return;
    const targetEmail = email || readSignUpEmail();
    if (!targetEmail) {
      setLostEmail(true);
      return;
    }

    setResending(true);
    setError(null);
    attemptedCodeRef.current = null;

    try {
      const res = await emailOtp.sendVerificationOtp({
        email: targetEmail,
        type: "sign-in",
      });

      if (res.error) {
        setError(friendlyCodeError(res.error.message ?? res.error));
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

        {lostEmail ? (
          <p className="text-center text-xs text-jumpa-warning">
            We've lost track of which email to verify — this can happen if the
            tab reloads.{" "}
            <Link
              href={SIGN_UP_FLOW.email}
              className="font-semibold underline underline-offset-2"
            >
              Enter your email again
            </Link>
            .
          </p>
        ) : error ? (
          <p className="text-center text-xs text-jumpa-warning">{error}</p>
        ) : null}

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
