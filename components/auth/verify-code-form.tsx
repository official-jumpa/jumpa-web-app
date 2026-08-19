"use client";

import { InfoNote } from "@/components/auth/info-note";
import { NumericKeypad } from "@/components/auth/numeric-keypad";
import { PinDisplay } from "@/components/auth/pin-display";
import { SuccessSheet } from "@/components/auth/success-sheet";
import { usePinInput } from "@/hooks/use-pin-input";

const CODE_LENGTH = 6;

/** Verification code entry. The sheet opens once six digits are in. */
export function VerifyCodeForm({ nextHref }: { nextHref: string }) {
  const code = usePinInput(CODE_LENGTH);

  return (
    <>
      <div className="mt-8 flex flex-1 flex-col gap-6">
        <PinDisplay length={CODE_LENGTH} value={code.value} />
        <InfoNote>
          Didn't get Code?{" "}
          <button type="button" className="font-semibold">
            Resend Code
          </button>
        </InfoNote>
      </div>

      <NumericKeypad onDigit={code.push} onBackspace={code.backspace} />

      {code.complete ? (
        <SuccessSheet
          title="Verification successful"
          description="Your code has been verified successfully. You can now continue."
          actionHref={nextHref}
          actionLabel="Continue"
        />
      ) : null}
    </>
  );
}
