import { apyForDays, type SavingsKind } from "@/lib/savings";

/** Data and formatting for the unified savings hub. */

export type SavingsCurrency = "NGN" | "USDC";
export type HubCurrency = SavingsCurrency;

export const SAVINGS_CURRENCIES: readonly { value: SavingsCurrency; label: string }[] =
  [
    { value: "NGN", label: "Naira" },
    { value: "USDC", label: "USDC" },
  ];
export const HUB_CURRENCIES = SAVINGS_CURRENCIES;

const SYMBOL: Record<SavingsCurrency, string> = { NGN: "₦", USDC: "$" };

const DAY_MS = 86_400_000;

export function currencySymbol(currency: HubCurrency): string {
  return SYMBOL[currency];
}

/** "1,200,000.00" — the figure without its symbol, for the hero's split type. */
export function formatFigure(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatMoney(value: number, currency: HubCurrency): string {
  return `${SYMBOL[currency]}${formatFigure(value)}`;
}

export type SlideDirection = "left" | "right";

/** Which side content enters from when a switch moves — the way its thumb went. */
export function slideDirection<T>(
  order: readonly { value: T }[],
  from: T,
  to: T,
): SlideDirection {
  const index = (value: T) =>
    order.findIndex((option) => option.value === value);
  return index(to) > index(from) ? "right" : "left";
}

/** The last switch the hub saw, so only what that switch changed slides in. */
export type HubMotion = { direction: SlideDirection; by: "currency" | "tab" };

/** The plan list's two views: plans still saving, and plans that have paid out. */
export type PlanTab = "active" | "completed";

export const PLAN_TABS: readonly { value: PlanTab; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export type SavingsActivityKind = "deposit" | "withdrawal" | "interest";
export type HubActivityKind = SavingsActivityKind;

export type SavingsActivity = {
  id: string;
  kind: SavingsActivityKind;
  amount: number;
  /** Local calendar day, `YYYY-MM-DD` — streaks are counted from it. */
  at: string;
  /** Who paid it in, on a circle; absent means you. */
  by?: string;
};
export type HubActivity = SavingsActivity;

export type SavingsGoal = {
  id: string;
  name: string;
  kind: SavingsKind;
  currency: SavingsCurrency;
  saved: number;
  initialDeposit?: number;
  /** A lock has no target of its own — its target is what was locked. */
  target: number;
  interestEarned: number;
  /** Length of the plan in days; `null` is an open-ended goal. */
  termDays: number | null;
  daysLeft: number | null;
  startDate: string;
  circle?: SavingsCircle;
  activity: SavingsActivity[];
  /** APY locked at creation time */
  apy: number;
  /** Set when the plan is withdrawn. It moves to Completed and keeps its final figures. */
  closed?: SavingsClosure;
};
export type HubGoal = SavingsGoal;

export type SavingsClosure = {
  date: string;
  paidOut: number;
  /** A lock left before it matured gives up its interest. */
  forfeited: boolean;
};
export type HubClosure = SavingsClosure;

export type SavingsCircleMember = {
  id: string;
  name: string;
  you?: boolean;
  owner?: boolean;
  /** What this member has put in; 0 until their first deposit. */
  saved: number;
};
export type HubCircleMember = SavingsCircleMember;

export type SavingsCircle = {
  /** "save_together" (everyone keeps their own) vs "shared_pool" (owner dispatches) */
  style?: "save_together" | "shared_pool";
  /** What the invite link carries. */
  inviteCode: string;
  /** Head count set when the circle was made — the invite limit. */
  capacity: number;
  members: SavingsCircleMember[];
  /** Members get a weekly nudge to add their share. */
  reminders: boolean;
};
export type HubCircle = SavingsCircle;

/** How each product names itself on a card, in a pill and in a header. */
export const SAVINGS_KINDS: Record<
  SavingsKind,
  { title: string; pill: string; style: string }
> = {
  individual: {
    title: "Savings goal",
    pill: "Flexible",
    style: "At your own pace",
  },
  lock: {
    title: "Lock savings",
    pill: "Locked",
    style: "Locked until it matures",
  },
  circle: {
    title: "Circle",
    pill: "Circle",
    style: "One shared target",
  },
};
export const HUB_KINDS = SAVINGS_KINDS;

export const ACTIVITY_LABEL: Record<HubActivityKind, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  interest: "Interest",
};


/**
 * How far along, 0–1 and unrounded. A lock measures how much of its term has
 * passed, the same way `PlanCard` does; everything else saved against target.
 */
export function goalShare(goal: HubGoal): number {
  const share =
    goal.kind === "lock"
      ? goal.termDays && goal.daysLeft !== null
        ? (goal.termDays - goal.daysLeft) / goal.termDays
        : 0
      : goal.target > 0
        ? goal.saved / goal.target
        : 0;
  return Math.max(0, Math.min(1, share));
}

/** Percent along, 0–100, for display. Milestones compare `goalShare`, so 49.6% is never "halfway". */
export function goalProgress(goal: HubGoal): number {
  return Math.round(goalShare(goal) * 100);
}

/** "64% saved" or, for a lock, "80% of term". */
export function progressLabel(goal: HubGoal): string {
  const progress = goalProgress(goal);
  return goal.kind === "lock" ? `${progress}% of term` : `${progress}% saved`;
}

export function goalMatured(goal: HubGoal): boolean {
  return goal.daysLeft === 0;
}

/** "Completed 01 Jun 2026", or "Closed early …" when a lock was left before it matured. */
export function closedLabel(closure: HubClosure): string {
  return `${closure.forfeited ? "Closed early" : "Completed"} ${closure.date}`;
}

/** "42 days left", "Matured" or "No deadline". */
export function timeLeft(goal: HubGoal): string {
  if (goal.daysLeft === null) return "No deadline";
  if (goal.daysLeft === 0) return "Matured";
  return `${goal.daysLeft} ${goal.daysLeft === 1 ? "day" : "days"} left`;
}

/** End date in the same form as `startDate`, so the two read alike. */
export function goalEndLabel(goal: HubGoal): string | null {
  if (goal.daysLeft === null) return null;
  const end = new Date();
  end.setDate(end.getDate() + goal.daysLeft);
  return dayLabel(end);
}

/** Start and end as one row: "07 Sept 2026 – 06 Dec 2026". A closed plan ends the day it paid out. */
export function goalPeriod(goal: HubGoal): { label: string; value: string } {
  const end = goal.closed?.date ?? goalEndLabel(goal) ?? "No deadline";
  return {
    label: goal.kind === "lock" ? "Lock period" : "Period",
    value: `${goal.startDate} – ${end}`,
  };
}

export type CircleStyleKey = NonNullable<SavingsCircle["style"]>;

/** How a circle shares its money: the row that names it and the rule for taking it out. */
export const CIRCLE_STYLES: Record<
  CircleStyleKey,
  { label: string; rule: string }
> = {
  save_together: {
    label: "Save together",
    rule: "Members withdraw their share",
  },
  shared_pool: {
    label: "Pooled savings",
    rule: "Owner withdraws the pool",
  },
};

/** A circle's sharing rules; one saved before `style` existed shares like a new one. */
export function circleStyle(circle: SavingsCircle) {
  return CIRCLE_STYLES[circle.style ?? "save_together"];
}

/** "Save together · 4 of 6 members", or the product's own line when it is not a circle. */
export function savingStyle(goal: HubGoal): string {
  const { circle } = goal;
  if (!circle) return HUB_KINDS[goal.kind].style;
  return `${circleStyle(circle).label} · ${circle.members.length} of ${circle.capacity} members`;
}



/** "09 Oct 2026" — the one date format the hub prints. */
function dayLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function todayLabel(): string {
  return dayLabel(new Date());
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `YYYY-MM-DD` in local time — the form activity is stored in. */
export function isoDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Days since 1970-01-01 for a stored day; UTC, so the maths never crosses a DST change. */
export function dayNumber(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

/** The inverse of `dayNumber`, printed the hub's way. */
export function dayNumberLabel(day: number): string {
  return new Date(day * DAY_MS).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

/** "Today", "Yesterday" or "02 Sep 2026". */
export function activityLabel(iso: string): string {
  const diff = dayNumber(isoDay(new Date())) - dayNumber(iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const [year, month, day] = iso.split("-").map(Number);
  return dayLabel(new Date(year, month - 1, day));
}

/** A new plan, opened with its first deposit already in it. */
export function createGoal(input: {
  kind: SavingsKind;
  currency: HubCurrency;
  name: string;
  deposit: number;
  target: number;
  termDays: number | null;
  /** A circle's head count — its invite limit. */
  members?: number;
  circleStyle?: CircleStyleKey;
}): HubGoal {
  const stamp = Date.now();
  return {
    id: `g-${stamp}`,
    name: input.name,
    kind: input.kind,
    currency: input.currency,
    saved: input.deposit,
    target: input.target,
    interestEarned: 0,
    termDays: input.termDays,
    daysLeft: input.termDays,
    startDate: todayLabel(),
    apy: apyForDays(input.kind, input.termDays),
    circle:
      input.kind === "circle"
        ? {
            style: input.circleStyle || "save_together",
            inviteCode: stamp.toString(36).slice(-6),
            capacity: input.members ?? 2,
            reminders: true,
            members: [
              {
                id: `m-${stamp}`,
                name: "You",
                you: true,
                owner: true,
                saved: input.deposit,
              },
            ],
          }
        : undefined,
    activity: [
      {
        id: `h-${stamp}`,
        kind: "deposit",
        amount: input.deposit,
        at: isoDay(new Date()),
      },
    ],
  };
}

/** What withdrawing pays out: the balance, plus interest unless it is forfeited. */
export function payoutFor(goal: HubGoal, forfeit: boolean): number {
  return goal.saved + (forfeit ? 0 : goal.interestEarned);
}

/** The plan after a withdrawal: closed, its payout recorded, its figures kept. */
export function closeGoal(goal: HubGoal, forfeit: boolean): HubGoal {
  const paidOut = payoutFor(goal, forfeit);
  return {
    ...goal,
    closed: { date: todayLabel(), paidOut, forfeited: forfeit },
    activity: [
      {
        id: `h-${Date.now()}`,
        kind: "withdrawal",
        amount: paidOut,
        at: isoDay(new Date()),
      },
      ...goal.activity,
    ],
  };
}

/** The same plan with a top-up added to its balance, its activity and, on a circle, your share. */
export function withDeposit(goal: HubGoal, amount: number): HubGoal {
  const { circle } = goal;
  return {
    ...goal,
    saved: goal.saved + amount,
    circle: circle && {
      ...circle,
      members: circle.members.map((member) =>
        member.you ? { ...member, saved: member.saved + amount } : member,
      ),
    },
    activity: [
      {
        id: `h-${Date.now()}`,
        kind: "deposit",
        amount,
        at: isoDay(new Date()),
      },
      ...goal.activity,
    ],
  };
}
