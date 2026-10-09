import { useState } from "react";
import {
  PLAN_ACTION_BUTTON,
  PlanActions,
} from "@/components/savings/plan-actions";
import { WithdrawWarningSheet } from "@/components/savings/withdraw-warning-sheet";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { ArrowUpFromArcIcon } from "@/components/ui/icons/arrow-up-from-arc";
import { CheckIcon } from "@/components/ui/icons/check";
import { PlusIcon } from "@/components/ui/icons/plus";
import { ShareArrowIcon } from "@/components/ui/icons/share-arrow";
import { WalletPlusIcon } from "@/components/ui/icons/wallet-plus";
import { formatApy } from "@/lib/savings";
import {
  currencySymbol,
  formatFigure,
  formatMoney,
  goalApy,
  goalEndLabel,
  goalMatured,
  goalProgress,
  HUB_KINDS,
  type HubClosure,
  type HubGoal,
  progressLabel,
  timeLeft,
} from "@/lib/savings-hub";
import { reachedMilestone } from "@/lib/savings-moments";
import { Equivalent } from "./equivalent";
import { GoalActivity } from "./goal-activity";
import { HeroAmount, HeroNote, HeroStat, HubHero } from "./hub-hero";
import { MilestoneTrack } from "./moments/milestone-track";
import { TopUpSheet } from "./top-up-sheet";
import { WithdrawSheet } from "./withdraw-sheet";

type Sheet = "top-up" | "warning" | "withdraw" | null;

/**
 * One plan: balance and progress, what it earns, its terms and its history.
 * A closed plan keeps the same screen as a record of what it paid out.
 */
export function GoalDetail({
  goal,
  onBack,
  onTopUp,
  onWithdraw,
  onSaveAgain,
  onShare,
}: {
  goal: HubGoal;
  onBack: () => void;
  onTopUp: (amount: number) => void;
  /** `forfeit` is true when a lock is left before it matures. */
  onWithdraw: (forfeit: boolean) => void;
  /** A closed plan's one action: start another of the same kind. */
  onSaveAgain: () => void;
  /** Opens this plan's share card: its latest milestone, or its start. */
  onShare: () => void;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const { closed } = goal;
  const locked = goal.kind === "lock";
  const matured = goalMatured(goal);
  // Leaving a lock before it matures is the one exit that costs something.
  const early = locked && !matured;
  const end = goalEndLabel(goal);
  const figure = closed ? closed.paidOut : goal.saved;

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <TransferHeader
        back="/home"
        onBack={onBack}
        title={HUB_KINDS[goal.kind].title}
        action={
          // A plan given up early has nothing to celebrate.
          closed?.forfeited ? null : (
            <button
              type="button"
              aria-label={`Share ${goal.name}`}
              onClick={onShare}
              className="tap flex size-9.5 items-center justify-center rounded-full border border-jumpa-primary-600 bg-jumpa-secondary-150 text-jumpa-primary-600 active:scale-95"
            >
              <ShareArrowIcon className="size-4.5" />
            </button>
          )
        }
      />

      <HubHero
        badge={goal.name}
        aside={<StatusChip closed={closed} matured={matured} />}
        meter={
          <span className="flex flex-col gap-3">
            <MilestoneTrack
              progress={goalProgress(goal)}
              reached={reachedMilestone(goal)}
              kind={goal.kind}
            />
            <span className="flex justify-between border-t border-jumpa-white/15 pt-2.5 text-[10px] leading-3 text-jumpa-primary-100">
              <span>{progressLabel(goal)}</span>
              <span>{closed ? `Closed ${closed.date}` : timeLeft(goal)}</span>
            </span>
          </span>
        }
        foot={
          <>
            <HeroStat
              label="Interest earned"
              value={
                closed?.forfeited
                  ? "Forfeited"
                  : formatMoney(goal.interestEarned, goal.currency)
              }
              accent={!closed?.forfeited}
            />
            <HeroStat
              label="Interest rate"
              value={`${formatApy(goalApy(goal))} a year`}
              align="end"
            />
          </>
        }
      >
        <HeroAmount
          symbol={currencySymbol(goal.currency)}
          figure={formatFigure(figure)}
        />
        <p className="text-xs leading-4 text-jumpa-primary-100">
          {closed
            ? `Paid out to your ${goal.currency} wallet`
            : locked
              ? "Locked balance"
              : `of ${formatMoney(goal.target, goal.currency)} target`}
        </p>
        <HeroNote>
          <Equivalent value={figure} currency={goal.currency} tone="onBrand" />
        </HeroNote>
      </HubHero>

      <PlanActions>
        {closed ? (
          <button
            type="button"
            onClick={onSaveAgain}
            className={PLAN_ACTION_BUTTON}
          >
            <PlusIcon className="size-6 text-jumpa-primary-600" />
            Start a new plan
          </button>
        ) : (
          <>
            {locked ? null : (
              <button
                type="button"
                onClick={() => setSheet("top-up")}
                className={PLAN_ACTION_BUTTON}
              >
                <WalletPlusIcon className="size-6 text-jumpa-primary-600" />
                Top up
              </button>
            )}
            <button
              type="button"
              onClick={() => setSheet(early ? "warning" : "withdraw")}
              className={PLAN_ACTION_BUTTON}
            >
              <ArrowUpFromArcIcon className="size-6 text-jumpa-primary-600" />
              Withdraw
            </button>
          </>
        )}
      </PlanActions>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium text-jumpa-black">Plan details</h2>
        <DetailList>
          <DetailRow label="Started" value={goal.startDate} />
          {closed ? (
            <DetailRow label="Closed" value={closed.date} />
          ) : (
            <DetailRow
              label={locked ? "Unlocks" : "Ends"}
              value={end ?? "No deadline"}
            />
          )}
          <DetailRow
            label="How you save"
            value={
              goal.circle
                ? `${goal.circle.members.length} of ${goal.circle.capacity} members, one target`
                : HUB_KINDS[goal.kind].style
            }
          />
          <DetailRow
            label={closed ? "Paid out to" : "Pays out to"}
            value={`Your ${goal.currency} wallet`}
            rule={false}
          />
        </DetailList>
      </section>

      <GoalActivity activity={goal.activity} currency={goal.currency} />

      {sheet === "top-up" ? (
        <TopUpSheet
          goal={goal}
          onClose={() => setSheet(null)}
          onConfirm={(amount) => {
            setSheet(null);
            onTopUp(amount);
          }}
        />
      ) : null}

      {sheet === "warning" ? (
        <WithdrawWarningSheet
          onKeep={() => setSheet(null)}
          onWithdrawAnyway={() => setSheet("withdraw")}
        />
      ) : null}

      {sheet === "withdraw" ? (
        <WithdrawSheet
          goal={goal}
          forfeit={early}
          onClose={() => setSheet(null)}
          onConfirm={() => {
            setSheet(null);
            onWithdraw(early);
          }}
        />
      ) : null}
    </div>
  );
}

/** The plan's state, in the hero's corner: a live dot while it runs, a tick once it has paid out. */
function StatusChip({
  closed,
  matured,
}: {
  closed?: HubClosure;
  matured: boolean;
}) {
  const label = closed
    ? closed.forfeited
      ? "Closed early"
      : "Completed"
    : matured
      ? "Matured"
      : "Active";

  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-jumpa-white/15 px-2.5 py-1 text-[10px] leading-3 font-medium text-jumpa-white">
      {closed ? (
        closed.forfeited ? null : (
          <CheckIcon className="size-3 text-jumpa-alt-400" />
        )
      ) : (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-jumpa-alt-400"
        />
      )}
      {label}
    </span>
  );
}
