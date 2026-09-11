"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";
import {
  clearSignUpValue,
  readSignUpValue,
  SIGN_UP_KEYS,
  writeSignUpValue,
} from "@/lib/sign-up";

const PASSWORD_LENGTH = 6;

/** Sequences and repeats — the "avoid 123456" the design asks for. */
function isWeak(value: string) {
  if (/^(\d)\1+$/.test(value)) return true;
  const digits = value.split("").map(Number);
  const step = digits[1] - digits[0];
  return (
    Math.abs(step) === 1 &&
    digits.every((digit, index) => index === 0 || digit - digits[index - 1] === step)
  );
}

/** Both halves of the password pair; `confirm` checks against the stored first entry. */
export function LoginPasswordForm({
  label,
  nextHref,
  confirm = false,
}: {
  label: string;
  nextHref: string;
  confirm?: boolean;
}) {
  const password = usePinInput(PASSWORD_LENGTH);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useKeypadKeys({ ...password, enabled: !submitting });

  const handleSavePassword = useCallback(
    async (value: string) => {
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch("/api/auth/wallet-setup?step=password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: value }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Failed to set password. Please try again.");
          password.clear();
          setSubmitting(false);
          return;
        }
        clearSignUpValue(SIGN_UP_KEYS.password);
        setSubmitting(false);
        router.push(nextHref);
      } catch {
        setError("Network error. Please try again.");
        password.clear();
        setSubmitting(false);
      }
    },
    [password.clear, nextHref, router],
  );

  useEffect(() => {
    if (!password.complete || submitting) return;

    if (confirm) {
      const first = readSignUpValue(SIGN_UP_KEYS.password);
      if (first && first !== password.value) {
        setError("Password does not match. Please try again.");
        password.clear();
        return;
      }
      handleSavePassword(password.value);
    } else {
      if (isWeak(password.value)) {
        setError("Avoid sequences and repeated digits. Pick another password.");
        password.clear();
        return;
      }
      writeSignUpValue(SIGN_UP_KEYS.password, password.value);
      router.push(nextHref);
    }
  }, [
    password.complete,
    password.value,
    password.clear,
    confirm,
    nextHref,
    router,
    submitting,
    handleSavePassword,
  ]);

  return (
    <>
      <div className="mt-8 flex flex-1 flex-col gap-8">
        <PinDisplay
          length={PASSWORD_LENGTH}
          value={password.value}
          label={label}
          error={!!error}
          autoFocus
          onValueChange={(next) => {
            if (error) setError(null);
            password.set(next);
          }}
        />

        {error ? (
          <p className="text-center text-xs text-jumpa-danger">{error}</p>
        ) : null}
      </div>

      <NumericKeypad
        onDigit={(digit) => {
          if (error) setError(null);
          password.push(digit);
        }}
        onBackspace={password.backspace}
        className={KEYPAD_PANEL}
      />
    </>
  );
}
