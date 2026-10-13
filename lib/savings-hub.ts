import { apyForDays, type SavingsKind } from "@/lib/savings";

/** Data and formatting for the unified savings hub prototype (`/savings-1`). */

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

/**
 * TODO(backend): placeholder plans for the prototype — replace with the
 * user's real plans from `/api/savings` before this screen ships. Your own
 * deposits sit on whole weeks back (7, 14, 21…), so the demo always opens on a
 * 3-week streak with this week still open, and ₦150,000 takes the MacBook halfway.
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
    daysLeft: 41,
    startDate: startedAgo(49),
    apy: 12,
    activity: [
      { id: "h-5", kind: "interest", amount: 18500, at: isoDaysAgo(0) },
      { id: "h-4", kind: "deposit", amount: 50000, at: isoDaysAgo(7) },
      { id: "h-3", kind: "deposit", amount: 50000, at: isoDaysAgo(14) },
      { id: "h-2", kind: "deposit", amount: 100000, at: isoDaysAgo(21) },
      { id: "h-1", kind: "deposit", amount: 250000, at: isoDaysAgo(49) },
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
    daysLeft: 89,
    startDate: startedAgo(91),
    apy: 8,
    activity: [
      { id: "h-8", kind: "interest", amount: 48.75, at: isoDaysAgo(0) },
      { id: "h-7", kind: "deposit", amount: 200, at: isoDaysAgo(42) },
      { id: "h-6", kind: "deposit", amount: 1000, at: isoDaysAgo(91) },
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
    daysLeft: 20,
    startDate: startedAgo(70),
    apy: 16,
    activity: [
      { id: "h-10", kind: "interest", amount: 32000, at: isoDaysAgo(0) },
      { id: "h-9", kind: "deposit", amount: 800000, at: isoDaysAgo(70) },
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
    daysLeft: 55,
    startDate: startedAgo(35),
    apy: 10,
    circle: {
      inviteCode: "kgl482",
      capacity: 6,
      reminders: true,
      members: [
        { id: "m-1", name: "You", you: true, owner: true, saved: 350000 },
        { id: "m-2", name: "Ada", saved: 200000 },
        { id: "m-3", name: "Tobi", saved: 100000 },
        { id: "m-4", name: "Kemi", saved: 0 },
      ],
    },
    activity: [
      { id: "h-15", kind: "interest", amount: 14200, at: isoDaysAgo(0) },
      {
        id: "h-14",
        kind: "deposit",
        amount: 100000,
        at: isoDaysAgo(6),
        by: "Tobi",
      },
      {
        id: "h-13",
        kind: "deposit",
        amount: 200000,
        at: isoDaysAgo(9),
        by: "Ada",
      },
      { id: "h-12", kind: "deposit", amount: 50000, at: isoDaysAgo(14) },
      { id: "h-11", kind: "deposit", amount: 300000, at: isoDaysAgo(35) },
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
    apy: 16,
    closed: { date: "14 Aug 2026", paidOut: 541000, forfeited: false },
    activity: [
      { id: "h-18", kind: "withdrawal", amount: 541000, at: "2026-08-14" },
      { id: "h-17", kind: "interest", amount: 41000, at: "2026-08-14" },
      { id: "h-16", kind: "deposit", amount: 500000, at: "2026-02-15" },
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
    apy: 12,
    closed: { date: "31 May 2026", paidOut: 309200, forfeited: false },
    activity: [
      { id: "h-22", kind: "withdrawal", amount: 309200, at: "2026-05-31" },
      { id: "h-21", kind: "interest", amount: 9200, at: "2026-05-31" },
      { id: "h-20", kind: "deposit", amount: 150000, at: "2026-04-04" },
      { id: "h-19", kind: "deposit", amount: 150000, at: "2026-03-02" },
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
    apy: 8,
    closed: { date: "20 Aug 2026", paidOut: 664.2, forfeited: false },
    activity: [
      { id: "h-26", kind: "withdrawal", amount: 664.2, at: "2026-08-20" },
      { id: "h-25", kind: "interest", amount: 14.2, at: "2026-08-20" },
      { id: "h-24", kind: "deposit", amount: 250, at: "2026-07-01" },
      { id: "h-23", kind: "deposit", amount: 400, at: "2026-05-23" },
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
    apy: 8,
    closed: { date: "16 Jul 2026", paidOut: 800, forfeited: true },
    activity: [
      { id: "h-28", kind: "withdrawal", amount: 800, at: "2026-07-16" },
      { id: "h-27", kind: "deposit", amount: 800, at: "2026-06-10" },
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

// Declarations, not consts: `HUB_GOALS` above calls these while the module loads.
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

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function isoDaysAgo(days: number): string {
  return isoDay(daysAgo(days));
}

function startedAgo(days: number): string {
  return dayLabel(daysAgo(days));
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
            // TODO(backend): the circles API issues the invite code.
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
