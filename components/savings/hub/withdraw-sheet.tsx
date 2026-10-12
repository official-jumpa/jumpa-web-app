import { useState } from "react";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { formatMoney, type HubGoal } from "@/lib/savings-hub";
import { MoneyField } from "./money-field";

/** What leaving or withdrawing from a plan pays out. */
export function WithdrawSheet({
  goal,
  forfeit,
  onClose,
  onConfirm,
}: {
  goal: HubGoal;
  /** An early exit from a lock gives up its interest. */
  forfeit: boolean;
  onClose: () => void;
  onConfirm: (amount?: number) => void;
}) {
  const isLock = goal.kind === "lock";
  // Locked plans withdraw everything. Flexible/circle plans let the user choose an amount.
  const [amountStr, setAmountStr] = useState(isLock ? String(goal.saved) : "");
  const [error, setError] = useState<string>();

  const selectedAmount = isLock ? goal.saved : Number(amountStr) || 0;
  const isAll = selectedAmount >= goal.saved;

  // Interest payout: If lock early exit, 0. If partial withdrawal on flexible, interest remains in plan. If full withdrawal, pays out interest.
  const interestPayout = forfeit ? 0 : isAll ? goal.interestEarned : 0;
  const totalPayout = selectedAmount + interestPayout;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isLock) {
      onConfirm(goal.saved);
      return;
    }

    if (selectedAmount <= 0) {
      setError("Enter the amount you want to withdraw");
      return;
    }
    if (selectedAmount > goal.saved) {
      setError(`Cannot withdraw more than your balance (${formatMoney(goal.saved, goal.currency)})`);
      return;
    }

    onConfirm(selectedAmount);
  };

  return (
    <BottomSheet onClose={onClose} pb="pb-5">
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6 pt-2">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl leading-6.5 font-medium text-jumpa-black">
            Withdraw savings
          </h2>
          <p className="max-w-72 text-xs leading-4 text-jumpa-neutral-500">
            {isLock
              ? `The money goes to your ${goal.currency} wallet, and ${goal.name} moves to Completed.`
              : `${formatMoney(goal.saved, goal.currency)} available. Interest stays in the plan until you withdraw it all.`}
          </p>
        </div>

        {!isLock ? (
          <div className="flex flex-col gap-2">
            <MoneyField
              label="Withdrawal amount"
              currency={goal.currency}
              value={amountStr}
              onChange={(next) => {
                setAmountStr(next);
                setError(undefined);
              }}
              error={error}
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setAmountStr(String(goal.saved));
                setError(undefined);
              }}
              className="self-end text-xs font-semibold text-jumpa-primary-600 active:underline"
            >
              Withdraw all
            </button>
          </div>
        ) : null}

        <DetailList>
          <DetailRow
            label="Principal to withdraw"
            value={formatMoney(selectedAmount, goal.currency)}
          />
          <DetailRow
            label="Interest"
            value={
              forfeit
                ? "Forfeited"
                : interestPayout > 0
                  ? formatMoney(interestPayout, goal.currency)
                  : isLock
                    ? formatMoney(goal.interestEarned, goal.currency)
                    : "Kept in plan"
            }
          />
          <DetailRow
            label="You receive"
            value={formatMoney(totalPayout, goal.currency)}
            rule={false}
          />
        </DetailList>

        <div className="flex flex-col gap-2">
          <Button variant="gradientSheet" size="lg" type="submit">
            Withdraw {formatMoney(totalPayout, goal.currency)}
          </Button>
          <Button variant="plain" size="lg" type="button" onClick={onClose}>
            Keep saving
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
