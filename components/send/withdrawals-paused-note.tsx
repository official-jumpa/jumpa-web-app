import { TriangleWarningIcon } from "@/components/ui/icons/triangle-warning";
import {
  NGN_WITHDRAWALS_PAUSED_MESSAGE,
  NGN_WITHDRAWALS_PAUSED_TITLE,
} from "@/lib/ngn-account";

/** Tells the user Naira withdrawals are switched off while the banking partner is down. */
export function WithdrawalsPausedNote() {
  return (
    <div
      role="status"
      className="flex gap-2.5 rounded-surface bg-jumpa-warning-50 px-3 py-3 inset-ring inset-ring-jumpa-warning/30"
    >
      <TriangleWarningIcon className="mt-0.5 size-5 shrink-0 text-jumpa-warning" />
      <div className="flex flex-col gap-0.5">
        <p className="text-xs leading-5 font-semibold text-jumpa-black">
          {NGN_WITHDRAWALS_PAUSED_TITLE}
        </p>
        <p className="text-xs leading-4 text-jumpa-neutral-550">
          {NGN_WITHDRAWALS_PAUSED_MESSAGE}
        </p>
      </div>
    </div>
  );
}
