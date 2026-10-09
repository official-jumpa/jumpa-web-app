import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { formatMoney, type HubGoal, payoutFor } from "@/lib/savings-hub";
import { Equivalent } from "./equivalent";

/** What leaving a plan pays out, before the money moves. */
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
  onConfirm: () => void;
}) {
  const payout = payoutFor(goal, forfeit);
  const total = formatMoney(payout, goal.currency);

  return (
    <BottomSheet onClose={onClose} pb="pb-5">
      <div className="flex flex-col gap-6 pt-2">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl leading-6.5 font-medium text-jumpa-black">
            Withdraw savings
          </h2>
          <p className="max-w-72 text-xs leading-4 text-jumpa-neutral-500">
            The money goes to your {goal.currency} wallet, and {goal.name} moves
            to Completed.
          </p>
        </div>

        <DetailList>
          <DetailRow
            label="Savings"
            value={formatMoney(goal.saved, goal.currency)}
          />
          <DetailRow
            label="Interest"
            value={
              forfeit
                ? "Forfeited"
                : formatMoney(goal.interestEarned, goal.currency)
            }
          />
          <DetailRow
            label="You receive"
            value={
              <span className="flex flex-col items-end gap-0.5">
                {total}
                <Equivalent value={payout} currency={goal.currency} />
              </span>
            }
            rule={false}
          />
        </DetailList>

        <div className="flex flex-col gap-2">
          <Button variant="gradientSheet" size="lg" onClick={onConfirm}>
            Withdraw {total}
          </Button>
          <Button variant="plain" size="lg" onClick={onClose}>
            Keep saving
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
