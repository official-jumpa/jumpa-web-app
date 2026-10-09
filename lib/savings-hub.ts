import { apyForDays, type SavingsKind } from "@/lib/savings";

/** Data and formatting for the unified savings hub prototype (`/savings-1`). */

export type HubCurrency = "NGN" | "USDC";

export const HUB_CURRENCIES: readonly { value: HubCurrency; label: string }[] =
  [
    { value: "NGN", label: "Naira" },
    { value: "USDC", label: "USDC" },
  ];

const SYMBOL: Record<HubCurrency, string> = { NGN: "₦", USDC: "$" };

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

/**
 * The figure in the other currency: naira shows dollars, USDC shows naira.
 * USDC is taken at $1, which is close enough for a hint and never for a quote.
 */
export function formatEquivalent(
  value: number,
  currency: HubCurrency,
  ngnPerUsd: number,
): string {
  if (currency === "NGN") {
    const usd = value / ngnPerUsd;
    return `≈ $${usd.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  // Whole naira: kobo on a converted figure is false precision.
  return `≈ ₦${Math.round(value * ngnPerUsd).toLocaleString("en-US")}`;
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

export type HubActivityKind = "deposit" | "withdrawal" | "interest";

export type HubActivity = {
  id: string;
  kind: HubActivityKind;
  amount: number;
  date: string;
};

export type HubGoal = {
  id: string;
  name: string;
  kind: SavingsKind;
  currency: HubCurrency;
  saved: number;
  /** A lock has no target of its own — its target is what was locked. */
  target: number;
  interestEarned: number;
  /** Length of the plan in days; `null` is an open-ended goal. */
  termDays: number | null;
  daysLeft: number | null;
  startDate: string;
  members?: number;
  activity: HubActivity[];
  /** Set when the plan is withdrawn. It moves to Completed and keeps its final figures. */
  closed?: HubClosure;
};

export type HubClosure = {
  date: string;
  paidOut: number;
  /** A lock left before it matured gives up its interest. */
  forfeited: boolean;
};

/** How each product names itself on a card, in a pill and in a header. */
export const HUB_KINDS: Record<
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

export const ACTIVITY_LABEL: Record<HubActivityKind, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  interest: "Interest",
};

/** Rate a goal earns, from the same tier table every savings screen quotes. */
export function goalApy(goal: HubGoal): number {
  return apyForDays(goal.kind, goal.termDays);
}

/**
 * Percent along, 0–100. A lock measures how much of its term has passed, the
 * same way `PlanCard` does; everything else measures saved against target.
 */
export function goalProgress(goal: HubGoal): number {
  const share =
    goal.kind === "lock"
      ? goal.termDays && goal.daysLeft !== null
        ? (goal.termDays - goal.daysLeft) / goal.termDays
        : 0
      : goal.target > 0
        ? goal.saved / goal.target
        : 0;
  return Math.max(0, Math.min(100, Math.round(share * 100)));
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

/** End date in the same form as `startDate`, so the two rows read alike. */
export function goalEndLabel(goal: HubGoal): string | null {
  if (goal.daysLeft === null) return null;
  const end = new Date();
  end.setDate(end.getDate() + goal.daysLeft);
  return dayLabel(end);
}

/**
 * TODO(backend): placeholder plans for the prototype — replace with the
 * user's real plans from `/api/savings` before this screen ships.
 */
export const HUB_GOALS: HubGoal[] = [
  {
    id: "g-1",
    name: "MacBook Pro M4 Fund",
    kind: "individual",
    currency: "NGN",
    saved: 450000,
    target: 1200000,
    interestEarned: 18500,
    termDays: 90,
    daysLeft: 42,
    startDate: "15 Aug 2026",
    activity: [
      { id: "h-3", kind: "interest", amount: 18500, date: "Today" },
      { id: "h-2", kind: "deposit", amount: 200000, date: "02 Sep 2026" },
      { id: "h-1", kind: "deposit", amount: 250000, date: "15 Aug 2026" },
    ],
  },
  {
    id: "g-2",
    name: "Emergency Reserve",
    kind: "individual",
    currency: "USDC",
    saved: 1200,
    target: 2500,
    interestEarned: 48.75,
    termDays: 180,
    daysLeft: 88,
    startDate: "01 Jul 2026",
    activity: [
      { id: "h-6", kind: "interest", amount: 48.75, date: "Today" },
      { id: "h-5", kind: "deposit", amount: 200, date: "15 Aug 2026" },
      { id: "h-4", kind: "deposit", amount: 1000, date: "01 Jul 2026" },
    ],
  },
  {
    id: "g-3",
    name: "Rent reserve",
    kind: "lock",
    currency: "NGN",
    saved: 800000,
    target: 800000,
    interestEarned: 32000,
    termDays: 90,
    daysLeft: 18,
    startDate: "20 Jul 2026",
    activity: [
      { id: "h-8", kind: "interest", amount: 32000, date: "Today" },
      { id: "h-7", kind: "deposit", amount: 800000, date: "20 Jul 2026" },
    ],
  },
  {
    id: "g-4",
    name: "Trip to Kigali",
    kind: "circle",
    currency: "NGN",
    saved: 650000,
    target: 1500000,
    interestEarned: 14200,
    termDays: 90,
    daysLeft: 65,
    startDate: "10 Aug 2026",
    members: 4,
    activity: [
      { id: "h-11", kind: "interest", amount: 14200, date: "Today" },
      { id: "h-10", kind: "deposit", amount: 350000, date: "28 Aug 2026" },
      { id: "h-9", kind: "deposit", amount: 300000, date: "10 Aug 2026" },
    ],
  },
  {
    id: "g-5",
    name: "School fees",
    kind: "lock",
    currency: "NGN",
    saved: 500000,
    target: 500000,
    interestEarned: 41000,
    termDays: 180,
    daysLeft: 0,
    startDate: "15 Feb 2026",
    closed: { date: "14 Aug 2026", paidOut: 541000, forfeited: false },
    activity: [
      { id: "h-15", kind: "withdrawal", amount: 541000, date: "14 Aug 2026" },
      { id: "h-14", kind: "interest", amount: 41000, date: "14 Aug 2026" },
      { id: "h-13", kind: "deposit", amount: 500000, date: "15 Feb 2026" },
    ],
  },
  {
    id: "g-6",
    name: "Wedding gift",
    kind: "individual",
    currency: "NGN",
    saved: 300000,
    target: 300000,
    interestEarned: 9200,
    termDays: 90,
    daysLeft: 0,
    startDate: "02 Mar 2026",
    closed: { date: "31 May 2026", paidOut: 309200, forfeited: false },
    activity: [
      { id: "h-20", kind: "withdrawal", amount: 309200, date: "31 May 2026" },
      { id: "h-19", kind: "interest", amount: 9200, date: "31 May 2026" },
      { id: "h-18", kind: "deposit", amount: 150000, date: "04 Apr 2026" },
      { id: "h-17", kind: "deposit", amount: 150000, date: "02 Mar 2026" },
    ],
  },
  {
    id: "g-7",
    name: "New phone",
    kind: "individual",
    currency: "USDC",
    saved: 650,
    target: 900,
    interestEarned: 14.2,
    termDays: 120,
    daysLeft: 31,
    startDate: "23 May 2026",
    closed: { date: "20 Aug 2026", paidOut: 664.2, forfeited: false },
    activity: [
      { id: "h-24", kind: "withdrawal", amount: 664.2, date: "20 Aug 2026" },
      { id: "h-23", kind: "interest", amount: 14.2, date: "20 Aug 2026" },
      { id: "h-22", kind: "deposit", amount: 250, date: "01 Jul 2026" },
      { id: "h-21", kind: "deposit", amount: 400, date: "23 May 2026" },
    ],
  },
  {
    id: "g-8",
    name: "Conference trip",
    kind: "lock",
    currency: "USDC",
    saved: 800,
    target: 800,
    interestEarned: 9.6,
    termDays: 90,
    daysLeft: 54,
    startDate: "10 Jun 2026",
    closed: { date: "16 Jul 2026", paidOut: 800, forfeited: true },
    activity: [
      { id: "h-26", kind: "withdrawal", amount: 800, date: "16 Jul 2026" },
      { id: "h-25", kind: "deposit", amount: 800, date: "10 Jun 2026" },
    ],
  },
];

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

/** A new plan, opened with its first deposit already in it. */
export function createGoal(input: {
  kind: SavingsKind;
  currency: HubCurrency;
  name: string;
  deposit: number;
  target: number;
  termDays: number | null;
  members?: number;
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
    members: input.members,
    activity: [
      {
        id: `h-${stamp}`,
        kind: "deposit",
        amount: input.deposit,
        date: "Today",
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
        date: "Today",
      },
      ...goal.activity,
    ],
  };
}

/** The same plan with a top-up added to its balance and its activity. */
export function withDeposit(goal: HubGoal, amount: number): HubGoal {
  return {
    ...goal,
    saved: goal.saved + amount,
    activity: [
      { id: `h-${Date.now()}`, kind: "deposit", amount, date: "Today" },
      ...goal.activity,
    ],
  };
}
