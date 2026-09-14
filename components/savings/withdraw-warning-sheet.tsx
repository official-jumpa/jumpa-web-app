"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

const BULLETS = [
  "Interest: You'll forfeit your accrued interest.",
  "Early withdrawal fee: A break fee may apply.",
  "Payout: You'll receive your eligible principal minus any applicable fee.",
];

/** Raised before an active plan's Withdraw action, so leaving early is a choice. */
export function WithdrawWarningSheet({
  onKeep,
  onWithdrawAnyway,
}: {
  onKeep: () => void;
  onWithdrawAnyway: () => void;
}) {
  return (
    <BottomSheet onClose={onKeep} pb="pb-5">
      <div className="flex flex-col items-center gap-6 pb-5">
        <div className="flex flex-col items-center gap-2.5 text-center">
          <h2 className="text-2xl leading-6.5 font-medium text-jumpa-black">
            Withdraw savings early?
          </h2>
          <p className="max-w-62.5 text-xs leading-3.5 text-jumpa-black">
            You&apos;ll lose the interest earned on this savings and may be
            charged an early withdrawal fee.
          </p>
        </div>

        <ul className="w-full list-disc rounded-surface bg-jumpa-primary-50 p-4 pl-8.5 text-xs leading-5 font-semibold text-jumpa-black">
          {BULLETS.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        <div className="flex w-full flex-col items-center gap-6">
          <Button variant="gradientSheet" size="lg" onClick={onKeep}>
            Keep my savings
          </Button>
          <button
            type="button"
            onClick={onWithdrawAnyway}
            className="tap text-base leading-4 font-medium text-jumpa-primary-600 active:scale-95"
          >
            Withdraw anyway
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
