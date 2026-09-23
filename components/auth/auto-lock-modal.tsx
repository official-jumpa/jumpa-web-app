"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";
import { authClient } from "@/lib/auth-client";

const PASSWORD_LENGTH = 6;

interface AutoLockModalProps {
  onUnlock: (password: string) => Promise<{ success: boolean; error?: string }>;
}

export function AutoLockModal({ onUnlock }: AutoLockModalProps) {
  const auth = useAuthContext();
  const user = auth?.user;

  const code = usePinInput(PASSWORD_LENGTH);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef<string | null>(null);

  const handleDigit = useCallback(
    (digit: string) => {
      if (error) setError(null);
      attemptedRef.current = null;
      code.push(digit);
    },
    [code, error],
  );

  const handleBackspace = useCallback(() => {
    if (error) setError(null);
    attemptedRef.current = null;
    code.backspace();
  }, [code, error]);

  const handleSet = useCallback(
    (next: string) => {
      if (error) setError(null);
      attemptedRef.current = null;
      code.set(next);
    },
    [code, error],
  );

  useKeypadKeys({
    push: handleDigit,
    backspace: handleBackspace,
    set: handleSet,
    enabled: !submitting,
  });

  const handleVerify = useCallback(
    async (passwordValue: string) => {
      if (submitting) return;
      setSubmitting(true);
      setError(null);

      const result = await onUnlock(passwordValue);

      if (!result.success) {
        setError(result.error || "Incorrect password");
        setSubmitting(false);
        code.clear();
        attemptedRef.current = null;
        return;
      }

      setSubmitting(false);
    },
    [onUnlock, submitting, code],
  );

  useEffect(() => {
    if (
      code.complete &&
      !submitting &&
      attemptedRef.current !== code.value
    ) {
      attemptedRef.current = code.value;
      handleVerify(code.value);
    }
  }, [code.complete, code.value, submitting, handleVerify]);

  const handleSignOut = async () => {
    try {
      if (typeof window !== "undefined") {
        document.cookie = "jumpa_unlocked=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
      }
      await fetch("/api/auth/verify-password", { method: "DELETE" }).catch(() => {});
      await authClient.signOut();
      window.location.href = "/sign-in";
    } catch {
      window.location.href = "/sign-in";
    }
  };

  const displayName =
    user?.nickname || user?.name || (user?.email ? user.email.split("@")[0] : "there");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Screen Lock"
      className="fixed inset-0 z-[9999] flex flex-col justify-between bg-white px-5 pt-[calc(env(safe-area-inset-top)+28px)] pb-[calc(env(safe-area-inset-bottom)+20px)] animate-in fade-in duration-200"
    >
      {/* Top Header */}
      <div className="flex flex-col items-center">
        <div className="mb-6 flex items-center justify-center">
          <Image
            src="/logo/wordmark/purple.png"
            alt="Jumpa"
            width={110}
            height={24}
            priority
            style={{ width: "auto", height: "auto" }}
            className="h-6 w-auto"
          />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-jumpa-black">
            Welcome back, {displayName}
          </h2>
          <p className="mt-1.5 text-xs text-jumpa-neutral-500">
            Enter your 6-digit login password to unlock Jumpa
          </p>
        </div>
      </div>

      {/* Middle Code Box & Status */}
      <div className="flex flex-col items-center gap-4 my-auto">
        <div className="w-full max-w-xs">
          <PinDisplay
            length={PASSWORD_LENGTH}
            value={code.value}
            error={Boolean(error)}
            autoFocus
            onValueChange={handleSet}
          />
        </div>

        {error ? (
          <p className="text-center text-xs font-semibold text-jumpa-danger animate-in shake">
            {error}
          </p>
        ) : submitting ? (
          <p className="animate-pulse text-center text-xs text-jumpa-neutral-500">
            Unlocking wallet...
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSignOut}
          className="cursor-pointer text-xs font-semibold text-jumpa-neutral-400 hover:text-jumpa-danger transition-colors mt-2"
        >
          Forgot password? Sign out
        </button>
      </div>

      {/* Bottom Numeric Keypad */}
      <div className="w-full max-w-sm mx-auto">
        <NumericKeypad
          onDigit={handleDigit}
          onBackspace={handleBackspace}
          disabled={submitting}
          className={KEYPAD_PANEL}
        />
      </div>
    </div>
  );
}
