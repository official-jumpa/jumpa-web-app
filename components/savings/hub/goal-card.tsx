import { KIND_ICON } from "@/components/savings/savings-types";
import { CheckIcon } from "@/components/ui/icons/check";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import {
  closedLabel,
  formatMoney,
  goalProgress,
  HUB_KINDS,
  type HubGoal,
  progressLabel,
  timeLeft,
} from "@/lib/savings-hub";
import { Equivalent } from "./equivalent";
import { ProgressBar } from "./progress-bar";

/** One plan in the hub list: what it is, how far along, and what it has earned. */
export function GoalCard({
  goal,
  onOpen,
}: {
  goal: HubGoal;
  onOpen: () => void;
}) {
  const Icon = KIND_ICON[goal.kind];
  const { closed } = goal;
  // A closed plan shows what it paid out; an open one what it holds.
  const figure = closed ? closed.paidOut : goal.saved;
  const suffix = closed
    ? "paid out"
    : goal.kind === "lock"
      ? "locked"
      : `of ${formatMoney(goal.target, goal.currency)}`;

  return (
    // inset-ring, not border: the card keeps the same box whatever its stroke.
    <button
      type="button"
      onClick={onOpen}
      className="tap flex w-full flex-col gap-4 rounded-surface bg-jumpa-neutral-50 p-4 text-left inset-ring-1 inset-ring-jumpa-neutral-100 active:scale-[0.99]"
    >
      <span className="flex items-center gap-3">
        {closed && !closed.forfeited ? (
          // Lime is the app's "done" — the same as a settled chat card.
          <span className="flex size-10 shrink-0 items-center justify-center rounded-panel bg-jumpa-alt-400 text-jumpa-primary-950">
            <CheckIcon className="size-5" />
          </span>
        ) : (
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-panel ${
              closed
                ? "bg-jumpa-neutral-100 text-jumpa-neutral-500"
                : "bg-jumpa-primary-950 text-jumpa-primary-50"
            }`}
          >
            <Icon className="size-5" />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm leading-4 font-semibold text-jumpa-black">
            {goal.name}
          </span>
          <span className="flex items-center gap-2">
            <span className="shrink-0 rounded-pill bg-jumpa-primary-100 px-2 py-0.5 text-[10px] leading-3 font-semibold text-jumpa-primary-600">
              {HUB_KINDS[goal.kind].pill}
            </span>
            <span className="truncate text-[11px] leading-3.5 text-jumpa-neutral-500">
              {closed ? closedLabel(closed) : timeLeft(goal)}
            </span>
          </span>
        </span>
        <ChevronRightIcon className="size-5 shrink-0 text-jumpa-neutral-300" />
      </span>

      <span className="flex flex-col gap-2">
        <span className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="text-base leading-5 font-semibold text-jumpa-black">
            {formatMoney(figure, goal.currency)}
          </span>
          <span className="min-w-0 truncate text-xs leading-4 text-jumpa-neutral-500">
            {suffix}
          </span>
          <span className="ml-auto pl-2">
            <Equivalent value={figure} currency={goal.currency} />
          </span>
        </span>
        <ProgressBar
          value={goalProgress(goal)}
          tone={closed ? "muted" : "plain"}
        />
        <span className="flex items-center justify-between gap-3 text-[11px] leading-3.5">
          <span className="font-medium text-jumpa-neutral-500">
            {progressLabel(goal)}
          </span>
          {closed?.forfeited ? (
            <span className="truncate font-medium text-jumpa-neutral-500">
              Interest forfeited
            </span>
          ) : (
            <span className="truncate font-semibold text-jumpa-primary-600">
              +{formatMoney(goal.interestEarned, goal.currency)} earned
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
