import { SavingsTypes } from "@/components/savings/savings-types";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { PlusIcon } from "@/components/ui/icons/plus";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import type { SavingsKind } from "@/lib/savings";
import {
  currencySymbol,
  formatFigure,
  formatMoney,
  HUB_CURRENCIES,
  type HubCurrency,
  type HubGoal,
  type HubMotion,
  PLAN_TABS,
  type PlanTab,
} from "@/lib/savings-hub";
import type { Streak } from "@/lib/savings-moments";
import { GoalCard } from "./goal-card";
import { HubEmpty } from "./hub-empty";
import { StreakButton } from "./moments/streak-button";
import { RefreshButton } from "./refresh-button";
import { slideIn } from "./slide-in";
import { TotalCard } from "./total-card";

/** What the empty card calls each currency. */
const CURRENCY_NAME: Record<HubCurrency, string> = {
  USDC: "Dollar",
  NGN: "Naira",
};

const EMPTY: Record<
  PlanTab,
  (currency: HubCurrency) => { title: string; caption: string }
> = {
  active: (currency) => ({
    title: `No active ${CURRENCY_NAME[currency]} plans`,
    caption: "Pick a way to save to start",
  }),
  completed: (currency) => ({
    title: `No completed ${CURRENCY_NAME[currency]} plans yet`,
    caption: "Plans you withdraw from move here, with what they paid out.",
  }),
};

/** Every plan in one currency: the total, the ways to save, then the plans. */
export function HubOverview({
  goals,
  currency,
  tab,
  motion,
  streak,
  onCurrency,
  onTab,
  onNew,
  onRefresh,
  onStory,
  onPick,
  onOpen,
}: {
  /** Already filtered to `currency`; open and closed alike. */
  goals: HubGoal[];
  currency: HubCurrency;
  tab: PlanTab;
  /** Set by either switch; whatever that switch changed slides in from its side. */
  motion: HubMotion | null;
  /** Across every plan in every currency — a deposit is a deposit. */
  streak: Streak;
  onCurrency: (next: HubCurrency) => void;
  onTab: (next: PlanTab) => void;
  /** The header's shortcut straight to a new flexible goal. */
  onNew: () => void;
  /** Re-reads the plans, for money that moved while the page was open. */
  onRefresh: () => void;
  /** Streak, badges and milestones, behind the header's flame. */
  onStory: () => void;
  onPick: (kind: SavingsKind) => void;
  onOpen: (goal: HubGoal) => void;
}) {
  const active = goals.filter((goal) => !goal.closed);
  const completed = goals.filter((goal) => goal.closed);
  const shown = tab === "active" ? active : completed;
  // The hero is what is saving now — paid-out money has left the plan.
  const saved = active.reduce((sum, goal) => sum + goal.saved, 0);
  const interest = active.reduce((sum, goal) => sum + goal.interestEarned, 0);
  const counts: Record<PlanTab, number> = {
    active: active.length,
    completed: completed.length,
  };
  const tabs = PLAN_TABS.map((option) => ({
    ...option,
    label: counts[option.value]
      ? `${option.label} (${counts[option.value]})`
      : option.label,
  }));
  const empty = EMPTY[tab](currency);
  // The list answers to both switches; the hero only to the currency.
  const listKey = `${currency}-${tab}`;
  const direction = motion?.direction ?? null;
  const heroDirection = motion?.by === "currency" ? direction : null;
  const amount = slideIn(heroDirection, 0);

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+0.875rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <TransferHeader
        back="/home"
        title="Savings"
        action={
          <span className="flex items-center gap-2">
            <StreakButton streak={streak} onClick={onStory} />
            <RefreshButton onClick={onRefresh} />
            <button
              type="button"
              aria-label="New savings goal"
              onClick={onNew}
              className="tap flex size-9.5 items-center justify-center rounded-full border border-jumpa-primary-600 bg-jumpa-secondary-150 text-jumpa-primary-600 active:scale-95"
            >
              <PlusIcon className="size-3.5" />
            </button>
          </span>
        }
      />

      <div className="mt-3.25">
        <TotalCard
          symbol={currencySymbol(currency)}
          figure={formatFigure(saved)}
          motion={{ key: currency, ...amount }}
          interest={formatMoney(interest, currency)}
          toggle={
            <SegmentedToggle
              variant="glass"
              slide
              options={HUB_CURRENCIES}
              value={currency}
              onChange={onCurrency}
            />
          }
        />
      </div>

      <div className="mt-8.75">
        <SavingsTypes layout="grid" onSelect={onPick} />
      </div>

      <section className="mt-4 flex flex-col gap-2.75">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm leading-4.5 font-medium tracking-jumpa-snug text-jumpa-black">
            Your plans
          </h2>
          <SegmentedToggle
            variant="soft"
            slide
            options={tabs}
            value={tab}
            onChange={onTab}
          />
        </div>

        {shown.length === 0 ? (
          <div key={listKey} {...slideIn(direction, 2)}>
            <HubEmpty title={empty.title} caption={empty.caption} />
          </div>
        ) : (
          <ul key={listKey} className="flex flex-col gap-3">
            {shown.map((goal, index) => (
              <li key={goal.id} {...slideIn(direction, index + 2)}>
                <GoalCard goal={goal} onOpen={() => onOpen(goal)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
