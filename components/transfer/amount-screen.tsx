"use client";

import type { ReactNode } from "react";
import { AmountStep } from "@/components/transfer/amount-step";
import { CloseButton } from "@/components/transfer/close-button";

type AmountStepProps = Parameters<typeof AmountStep>[0];

/**
 * "To <recipient>" header over the amount canvas. The bank and wallet flows
 * differ only in what `recipient` renders.
 */
export function AmountScreen({
  recipient,
  onClose,
  ...step
}: AmountStepProps & { recipient: ReactNode; onClose: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 px-4.5 pt-6 pb-4">
        <CloseButton onClick={onClose} label="Cancel transfer" />
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <span className="shrink-0 text-lg leading-4 font-medium text-jumpa-black">
            To
          </span>
          {recipient}
        </div>
        <span aria-hidden="true" className="size-9.5 shrink-0" />
      </header>

      <AmountStep {...step} />
    </div>
  );
}
