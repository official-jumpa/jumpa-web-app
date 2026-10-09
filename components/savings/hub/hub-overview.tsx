import { EmptyPlans } from "@/components/savings/empty-plans";
import { SavingsTypes } from "@/components/savings/savings-types";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { PlusIcon } from "@/components/ui/icons/plus";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { cn } from "@/lib/cn";
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
import { Equivalent } from "./equivalent";
import { GoalCard } from "./goal-card";
import { HeroAmount, HeroNote, HeroStat, HubHero } from "./hub-hero";
import { slideIn } from "./slide-in";

const EMPTY: Record<
  PlanTab,
  (currency: HubCurrency) => { title: string; caption: string }
> = {
  active: (currency) => ({
    title: `No active ${currency} plans`,
    caption: "Pick a way to save above to start one.",
  }),
  completed: (currency) => ({
    title: `No completed ${currency} plans yet`,
    caption: "Plans you withdraw from move here, with what they paid out.",
  }),
};

/** Every plan in one currency: the total, the ways to save, then the plans. */
export function HubOverview({
  goals,
  currency,
  tab,
  motion,
  onCurrency,
  onTab,
  onNew,
  onPick,
  onOpen,
}: {
  /** Already filtered to `currency`; open and closed alike. */
  goals: HubGoal[];
  currency: HubCurrency;
  tab: PlanTab;
  /** Set by either switch; whatever that switch changed slides in from its side. */
  motion: HubMotion | null;
  onCurrency: (next: HubCurrency) => void;
  onTab: (next: PlanTab) => void;
  /** The header's shortcut straight to a new flexible goal. */
  onNew: () => void;
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
  const stats = slideIn(heroDirection, 1);

  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <TransferHeader
        back="/home"
        title="Savings"
        action={
          <button
            type="button"
            aria-label="New savings goal"
            onClick={onNew}
            className="tap flex size-9.5 items-center justify-center rounded-full border border-jumpa-primary-600 bg-jumpa-secondary-150 text-jumpa-primary-600 active:scale-95"
          >
            <PlusIcon className="size-3.5" />
          </button>
        }
      />

      <HubHero
        badge="Total savings"
        aside={
          <SegmentedToggle
            variant="inverse"
            slide
            options={HUB_CURRENCIES}
            value={currency}
            onChange={onCurrency}
          />
        }
        foot={
          // Keyed on the currency, so a switch replays the entrance.
          <span
            key={currency}
            className={cn(
              "flex w-full items-end justify-between gap-3",
              stats.className,
            )}
            style={stats.style}
          >
            <HeroStat
              label="Interest earned"
              value={formatMoney(interest, currency)}
              accent
            />
            <HeroStat
              label="Active plans"
              value={String(active.length)}
              align="end"
            />
          </span>
        }
      >
        <span
          key={currency}
          className={cn("flex flex-col items-center gap-1.5", amount.className)}
          style={amount.style}
        >
          <HeroAmount
            symbol={currencySymbol(currency)}
            figure={formatFigure(saved)}
          />
          <HeroNote>
            <Equivalent value={saved} currency={currency} tone="onBrand" />
          </HeroNote>
        </span>
      </HubHero>

      <SavingsTypes layout="grid" onSelect={onPick} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-medium text-jumpa-black">Your plans</h2>
          <SegmentedToggle slide options={tabs} value={tab} onChange={onTab} />
        </div>

        {shown.length === 0 ? (
          <div key={listKey} {...slideIn(direction, 2)}>
            <EmptyPlans title={empty.title} caption={empty.caption} />
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
