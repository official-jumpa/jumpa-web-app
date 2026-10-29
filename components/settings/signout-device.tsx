"use client";

import Image from "next/image";
import { useState } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { settingsHref } from "@/components/settings/sections";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { LoadingModal } from "@/components/ui/loading-modal";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";
import { endSession, verifyTransactionPin } from "@/lib/account-session";

const PIN_LENGTH = 4;

/** Signs this device out once the transaction PIN checks out. */
export function SignoutDevice() {
  const auth = useAuthContext();
  const pin = usePinInput(PIN_LENGTH);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A rejected PIN stays on screen in red until the next keypress.
  const entry = {
    ...pin,
    push: (digit: string) => {
      if (error) {
        setError(null);
        pin.set(digit);
        return;
      }
      pin.push(digit);
    },
    backspace: () => {
      setError(null);
      pin.backspace();
    },
    set: (next: string) => {
      setError(null);
      pin.set(next);
    },
  };
  useKeypadKeys({ ...entry, enabled: !pending });

  const name = auth?.user?.nickname || auth?.user?.name;

  const signOut = async () => {
    if (pending) return;
    if (!pin.complete) {
      setError(`Enter your ${PIN_LENGTH}-digit PIN.`);
      return;
    }
    setPending(true);
    setError(null);
    const check = await verifyTransactionPin(pin.value);
    if (!check.ok) {
      setError(check.error);
      setPending(false);
      return;
    }
    const failed = await endSession("/api/auth/logout", "Could not sign you out.");
    if (failed) {
      setError(failed);
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <SettingsHeader
        back={settingsHref("devices")}
        title="Signout from this device"
      />

      <div className="mt-3 flex flex-col gap-8">
        <div className="flex flex-col gap-1.25">
          <h2 className="text-[28px] leading-8 font-semibold tracking-jumpa-snug text-jumpa-black">
            {name ? `Hello ${name}` : "Hello"}
          </h2>
          <p className="text-sm leading-4 text-jumpa-neutral-775">
            Enter your Passcode to Signout
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <PinDisplay
            length={PIN_LENGTH}
            value={pin.value}
            onValueChange={entry.set}
            error={Boolean(error) && pin.complete}
            autoFocus
          />
          <FieldError>{error ?? undefined}</FieldError>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <NumericKeypad
          onDigit={entry.push}
          onBackspace={entry.backspace}
          disabled={pending}
          className={KEYPAD_PANEL}
          leftKey={
            // TODO(backend): biometric sign-out is not wired yet.
            <button
              type="button"
              aria-label="Use fingerprint"
              className="tap active:scale-95"
            >
              <Image
                src="/images/auth/fingerprint.svg"
                alt=""
                width={34}
                height={34}
              />
            </button>
          }
        />
        <Button
          variant="gradient"
          size="lg"
          className="mt-1.25"
          onClick={signOut}
        >
          Signout
        </Button>
      </div>

      {pending ? <LoadingModal label="Signing you out" caption /> : null}
    </div>
  );
}
