import { useState } from "react";
import { CopyButton } from "@/components/auth/copy-button";
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
  circleStyle,
  currencySymbol,
  formatFigure,
  formatMoney,
  goalMatured,
  goalPeriod,
  goalProgress,
  HUB_KINDS,
  type HubCircle,
  type HubClosure,
  type HubGoal,
  progressLabel,
  savingStyle,
  timeLeft,
} from "@/lib/savings-hub";
import { reachedMilestone } from "@/lib/savings-moments";
import { GoalActivity } from "./goal-activity";
import { HeroAmount, HeroInterest, HubHero } from "./hub-hero";
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
  /** `forfeit` is true when a lock is left before it matures; `amount` is custom partial amount. */
  onWithdraw: (forfeit: boolean, amount?: number) => void;
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
  const figure = closed ? closed.paidOut : goal.saved;
  const period = goalPeriod(goal);
  const rate = `${formatApy(goal.apy)} a year`;

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
        {closed?.forfeited ? (
          <HeroInterest
            earned={null}
            caption={`Interest forfeited · ${rate}`}
          />
        ) : (
          <HeroInterest
            earned={formatMoney(goal.interestEarned, goal.currency)}
            caption={`earned · ${rate}`}
          />
        )}
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

      {goal.circle && !closed ? <CircleInvite circle={goal.circle} /> : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium text-jumpa-black">Plan details</h2>
        <DetailList>
          <DetailRow label={period.label} value={period.value} />
          <DetailRow
            label="How you save"
            value={savingStyle(goal)}
            rule={Boolean(goal.circle)}
          />
          {goal.circle ? (
            <DetailRow
              label="Withdrawals"
              value={circleStyle(goal.circle).rule}
              rule={false}
            />
          ) : null}
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
          onConfirm={(amount) => {
            setSheet(null);
            onWithdraw(early, amount);
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

/** The circle's invite code, with the app's own copy control beside it. */
function CircleInvite({ circle }: { circle: HubCircle }) {
  const open = circle.capacity - circle.members.length;

  return (
    <div className="flex items-center justify-between gap-3 rounded-surface bg-jumpa-neutral-50 py-3 pr-3 pl-4 inset-ring-1 inset-ring-jumpa-neutral-60">
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] leading-3.5 text-jumpa-neutral-500">
          {open > 0
            ? `Invite code · ${open} ${open === 1 ? "spot" : "spots"} left`
            : "Invite code · circle full"}
        </span>
        <span className="truncate font-mono text-base leading-5 font-semibold tracking-wider text-jumpa-black uppercase">
          {circle.inviteCode}
        </span>
      </span>
      <CopyButton
        value={circle.inviteCode}
        label="Copy"
        name="Copy invite code"
        className="shrink-0"
      />
    </div>
  );
}
