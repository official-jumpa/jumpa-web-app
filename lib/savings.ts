/** The three products on the savings landing. */
export type SavingsKind = "individual" | "lock" | "circle";

export type SavingsMember = {
  id: string;
  name: string;
  role: string;
  status: "Joined" | "Pending";
  avatar: string;
};

export type SavingsPlan = {
  id: string;
  kind: SavingsKind;
  name: string;
  /** Pre-formatted, as the card prints it. */
  endDate: string;
  status: "Active" | "Matured" | "Closed";
  saved: string;
  target: string;
  daysLeft: number;
  percent: number;
  startDate: string;
  endDateLong: string;
  frequency: string;
  members?: SavingsMember[];
};

/** URL slug per product — `circle` is plural in the path, singular in the data. */
const SLUG: Record<SavingsKind, string> = {
  individual: "individual",
  lock: "lock",
  circle: "circles",
};

const KIND_BY_SLUG: Record<string, SavingsKind> = {
  individual: "individual",
  lock: "lock",
  circles: "circle",
};

export function kindFromSlug(slug: string): SavingsKind | null {
  return KIND_BY_SLUG[slug] ?? null;
}

/**
 * Every savings URL in one place. A product is one route and the stage is a
 * query param, so a plan id never becomes a path segment — which is what let
 * a child's close button push its own parent and loop the back button.
 */
export function savingsHref(
  kind: SavingsKind,
  stage?: { id?: string; create?: boolean; topUp?: boolean },
): string {
  const base = `/savings/${SLUG[kind]}`;
  if (stage?.create) return `${base}?new=1`;
  if (!stage?.id) return base;

  const query = new URLSearchParams({ id: stage.id });
  if (stage.topUp) query.set("topup", "1");
  return `${base}?${query}`;
}

/** The three landings differ only in this — copy and where the plans come from. */
export const SAVINGS_PRODUCTS: Record<
  SavingsKind,
  {
    title: string;
    cta: string;
    listLabel: string;
    emptyTitle: string;
    emptyCaption?: string;
    /** True where placeholder plans still stand in for real data. */
    seeded?: boolean;
  }
> = {
  individual: {
    title: "Individual savings",
    cta: "Create new",
    listLabel: "Recent savings",
    emptyTitle: "No savings plans yet",
    emptyCaption: "Create a savings target to start earning",
  },
  lock: {
    title: "Locked savings",
    cta: "Create new",
    listLabel: "Recent Plans",
    emptyTitle: "No locked savings plans",
    emptyCaption: "Lock funds away to earn guaranteed APY",
  },
  circle: {
    title: "Circles",
    cta: "Create new circle",
    listLabel: "Recent Plans",
    emptyTitle: "No recent plans",
    seeded: true,
  },
};

/** What the masthead reports across every product. */
export const SAVINGS_SUMMARY = {
  goals: 0,
  saved: "0.00",
  target: "0.00",
  percent: 0,
  remaining: "0.00",
};

const MEMBERS: SavingsMember[] = [
  {
    id: "you",
    name: "You",
    role: "Admin Organizer",
    status: "Joined",
    avatar: "/images/notifications/avatar-1.webp",
  },
  {
    id: "ella",
    name: "Ella",
    role: "Creative Lead",
    status: "Joined",
    avatar: "/images/notifications/avatar-2.webp",
  },
  {
    id: "nina",
    name: "Nina",
    role: "Invited",
    status: "Pending",
    avatar: "/images/notifications/avatar-1.webp",
  },
];

const DECEMBER_TRIP = {
  name: "December Trip",
  endDate: "September 27",
  status: "Active" as const,
  saved: "$0.00",
  target: "$1000",
  daysLeft: 43,
  percent: 0,
  startDate: "September 27, 2026",
  endDateLong: "November 27, 2026",
  frequency: "Wednesday, Weekly",
};

/** Placeholder plans; only circles (groups) has a placeholder until implemented. */
export const SAVINGS_PLANS: SavingsPlan[] = [
  {
    ...DECEMBER_TRIP,
    id: "december-hangout",
    kind: "circle",
    members: MEMBERS,
  },
];

export function plansOf(kind: SavingsKind): SavingsPlan[] {
  return SAVINGS_PLANS.filter((plan) => plan.kind === kind);
}

export function findPlan(kind: SavingsKind, id: string) {
  return SAVINGS_PLANS.find((plan) => plan.kind === kind && plan.id === id);
}

/** Balance the masthead shows on a product's own landing. */
export const SAVINGS_BALANCE = {
  individual: {
    badge: "Personal savings",
    amount: "0.00",
    rate: "0.0% p.a.",
  },
  lock: { badge: "Locked savings", amount: "0.00", rate: "0.0% p.a." },
  circle: { badge: "Group savings", amount: "0.00" },
};

export const SAVINGS_CATEGORIES = [
  "Rent",
  "Travel",
  "School fees",
  "New car",
  "Other",
];

/** Lock terms in days; `null` opens the custom date range. */
export const LOCK_TERMS: { label: string; days: number | null }[] = [
  { label: "30 DAYS", days: 30 },
  { label: "60 DAYS", days: 60 },
  { label: "90 DAYS", days: 90 },
  { label: "Custom", days: null },
];

/** Target terms; `null` is an open-ended goal, which hides the end date. */
export const TARGET_TERMS: { label: string; days: number | null }[] = [
  { label: "30 DAYS", days: 30 },
  { label: "60 DAYS", days: 60 },
  { label: "90 DAYS", days: 90 },
  { label: "No Deadline", days: null },
];

export const SAVINGS_FREQUENCIES = ["Daily", "Weekly", "Monthly"];

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export type FundingSource = {
  id: string;
  label: string;
  balance: string;
  icon: "dollar" | "naira" | "crypto";
};

/** Wallets the lock flow can draw from. */
export const LOCK_SOURCES: FundingSource[] = [
  { id: "usd", label: "USD Balance", balance: "$0.00", icon: "dollar" },
  { id: "ngn", label: "NGN Balance", balance: "₦0.00", icon: "naira" },
];

/** The individual flow draws from crypto or NGN wallets. */
export const TARGET_SOURCES: FundingSource[] = [
  { id: "crypto", label: "Crypto", balance: "$0.00", icon: "crypto" },
  { id: "ngn", label: "NGN Balance", balance: "₦0.00", icon: "naira" },
];

/** Terms for Individual / Target savings (relaxed terms with no early break fee). */
export const INDIVIDUAL_SAVINGS_TERMS = [
  "Earn interest daily on your Savings",
  "Deposit at your own pace to reach your goal",
  "Withdraw anytime with no break fees",
];

/** Terms for Locked savings (fixed commitment with early break fee). */
export const LOCK_SAVINGS_TERMS = [
  "Earn interest daily on your locked funds",
  "Funds remain locked until your selected maturity date",
  "You will pay an early break fee of 5% if you withdraw before maturity",
];

/** Backwards-compatible alias */
export const SAVINGS_TERMS = INDIVIDUAL_SAVINGS_TERMS;

export const CIRCLE_TERMS = [
  "Earn interest daily on your Savings",
  "Withdrawals require group consensus after 50% of goal",
  "You will pay a break fee of 5% if you withdraw before the maturity date",
];

/** Placeholder invite link for a circle. */
export const CIRCLE_INVITE = "jumpa.app/circle/abc123";

/** A date the placeholder screens quote as the maturity date. */
export const DEFAULT_MATURITY = "2026/09/27";

const pad = (value: number) => String(value).padStart(2, "0");

/** `YYYY-MM-DD`, so the value drops straight into a `<input type="date">`. */
export function addDays(days: number, from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `2026/09/27` — how the design prints a date outside an input. */
export function displayDate(iso: string): string {
  return iso.replace(/-/g, "/");
}

/** "Sep 27" — the short form the yield row quotes. */
export function shortDate(iso: string): string {
  const [year, month, day] = iso.split(/[/-]/).map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
