import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { formatMoney, type HubGoal } from "@/lib/savings-hub";
import { milestonePhrase, nextMilestone } from "@/lib/savings-moments";
import { MomentGlyph } from "./moments/moment-glyph";
import { MoneyField } from "./money-field";

/** Adds money to a flexible plan or a circle. */
export function TopUpSheet({
  goal,
  onClose,
  onConfirm,
}: {
  goal: HubGoal;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();
  const remaining = Math.max(0, goal.target - goal.saved);
  const next = nextMilestone(goal);
  // Lights up once the typed amount is enough, so the goal is visible before it is earned.
  const enough = next !== null && Number(amount) >= next.needed;

  return (
    <BottomSheet onClose={onClose} pb="pb-7.5">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const value = Number(amount);
          if (value > 0) onConfirm(value);
          else setError("Enter the amount you want to add");
        }}
        className="flex flex-col gap-6 pt-2"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl leading-6.5 font-medium text-jumpa-black">
            Top up
          </h2>
          <p className="max-w-72 text-xs leading-4 text-jumpa-neutral-500">
            {remaining > 0
              ? `${formatMoney(remaining, goal.currency)} to go on ${goal.name}.`
              : `${goal.name} has reached its target.`}
          </p>
          {next ? (
            <span
              className={`mt-1 flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs leading-4 font-medium transition-colors duration-300 ${
                enough
                  ? "bg-jumpa-alt-400 text-jumpa-primary-950"
                  : "bg-jumpa-primary-50 text-jumpa-primary-600"
              }`}
            >
              <MomentGlyph name="flag" className="size-4" />
              {enough
                ? `That takes you ${milestonePhrase(next.mark)}`
                : `${formatMoney(next.needed, goal.currency)} more takes you ${milestonePhrase(next.mark)}`}
            </span>
          ) : null}
        </div>

        <MoneyField
          label="Amount"
          currency={goal.currency}
          value={amount}
          onChange={(next) => {
            setAmount(next);
            setError(undefined);
          }}
          error={error}
          autoFocus
        />

        <Button type="submit" variant="gradientSheet" size="lg">
          Top up
        </Button>
      </form>
    </BottomSheet>
  );
}
