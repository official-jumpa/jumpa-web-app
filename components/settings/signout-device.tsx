"use client";

import Image from "next/image";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { settingsHref } from "@/components/settings/sections";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Button } from "@/components/ui/button";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { usePinInput } from "@/hooks/use-pin-input";

const PIN_LENGTH = 4;

/** Confirm signing this device out with the passcode. Screen only for now. */
export function SignoutDevice() {
  const auth = useAuthContext();
  const pin = usePinInput(PIN_LENGTH);
  useKeypadKeys(pin);

  const name = auth?.user?.nickname || auth?.user?.name;

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
        <PinDisplay
          length={PIN_LENGTH}
          value={pin.value}
          onValueChange={pin.set}
          autoFocus
        />
      </div>

      <div className="mt-auto pt-6">
        <NumericKeypad
          onDigit={pin.push}
          onBackspace={pin.backspace}
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
        {/* TODO(backend): verify the PIN and end this session. */}
        <Button variant="gradient" size="lg" className="mt-1.25">
          Signout
        </Button>
      </div>
    </div>
  );
}
