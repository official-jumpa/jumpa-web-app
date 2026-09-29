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
  /** "1.5% p.a." — the pill on a lock plan's card. */
  rate?: string;
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
  stage?: { id?: string; create?: boolean; join?: boolean; topUp?: boolean },
): string {
  const base = `/savings/${SLUG[kind]}`;
  if (stage?.create) return `${base}?new=1`;
  if (stage?.join) return `${base}?join=1`;
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

/**
 * Balance the masthead shows on a product's own landing. The rate is no longer
 * stored here — it comes from `rateRange(kind)`, so the hero, the product cards
 * and the term chips cannot quote different numbers.
 */
export const SAVINGS_BALANCE: Record<
  SavingsKind,
  { badge: string; amount: string }
> = {
  individual: { badge: "Referral Earnings", amount: "0.00" },
  lock: { badge: "Locked savings", amount: "0.00" },
  circle: { badge: "Group savings", amount: "0.00" },
};

export const SAVINGS_CATEGORIES = [
  "Rent",
  "Travel",
  "School fees",
  "New car",
  "Other",
];

export type SavingsTerm = {
  label: string;
  /** `null` is either an open-ended goal or a custom range. */
  days: number | null;
  /** The length is only known once the user picks two dates. */
  custom?: true;
};

/** Lock terms in days; `custom` opens the date range. */
export const LOCK_TERMS: SavingsTerm[] = [
  { label: "30 DAYS", days: 30 },
  { label: "60 DAYS", days: 60 },
  { label: "90 DAYS", days: 90 },
  { label: "Custom", days: null, custom: true },
];

/** Target terms; `null` is an open-ended goal, which hides the end date. */
export const TARGET_TERMS: SavingsTerm[] = [
  { label: "30 DAYS", days: 30 },
  { label: "60 DAYS", days: 60 },
  { label: "90 DAYS", days: 90 },
  { label: "No Deadline", days: null },
];

/**
 * ─── Rate card ────────────────────────────────────────────────────────────
 * TODO(product): THESE ARE PLACEHOLDER RATES. Replace every band before launch.
 * Nothing derives them from the vault — `getLiveVaultApy` reports one flat APY
 * per vault with no term structure, so the tiers have to live here until the
 * real rate card exists. Every rate quoted anywhere in savings resolves through
 * `apyForDays` / `rateRange`, so this block is the only thing to change.
 *
 * Bands are ascending and a day count earns the last one it clears. A longer
 * commitment pays more, and a locked plan pays more than a flexible one because
 * the money cannot be pulled out early.
 */
type RateBand = { minDays: number; apy: number };

const RATE_BANDS: Record<SavingsKind, RateBand[]> = {
  individual: [
    { minDays: 0, apy: 2.5 },
    { minDays: 30, apy: 3.5 },
    { minDays: 60, apy: 4.25 },
    { minDays: 90, apy: 5.0 },
    { minDays: 180, apy: 6.5 },
    { minDays: 365, apy: 8.0 },
  ],
  lock: [
    { minDays: 30, apy: 5.0 },
    { minDays: 60, apy: 6.5 },
    { minDays: 90, apy: 8.0 },
    { minDays: 180, apy: 11.0 },
    { minDays: 365, apy: 14.49 },
  ],
  circle: [
    { minDays: 0, apy: 3.0 },
    { minDays: 60, apy: 4.0 },
    { minDays: 90, apy: 5.0 },
    { minDays: 180, apy: 7.0 },
    { minDays: 365, apy: 9.5 },
  ],
};

/** How every savings screen prints one rate. */
export function formatApy(apy: number): string {
  return `${apy.toFixed(2)}%`;
}

/** The APY a plan of this length earns. An open-ended goal earns the base band. */
export function apyForDays(kind: SavingsKind, days: number | null): number {
  const bands = RATE_BANDS[kind];
  if (days === null) return bands[0].apy;
  let apy = bands[0].apy;
  for (const band of bands) {
    if (days >= band.minDays) apy = band.apy;
  }
  return apy;
}

/** "2.50% – 14.49%" — what a product advertises before a term is picked. */
export function rateRange(kind: SavingsKind): string {
  const rates = RATE_BANDS[kind].map((band) => band.apy);
  return `${formatApy(Math.min(...rates))} – ${formatApy(Math.max(...rates))}`;
}

/** The rate a term chip prints under its label. */
export function rateForTerm(
  kind: SavingsKind,
  terms: readonly SavingsTerm[],
  label: string,
): string | undefined {
  const option = terms.find((term) => term.label === label);
  if (!option) return undefined;
  // A custom range has no rate until both dates are chosen.
  if (option.custom) return "varies";
  return formatApy(apyForDays(kind, option.days));
}

/** Simple interest over the term — what the estimate line quotes. */
export function projectedYield(
  principal: number,
  apy: number,
  days: number,
): number {
  if (principal <= 0 || days <= 0) return 0;
  return (principal * (apy / 100) * days) / 365;
}

export const SAVINGS_FREQUENCIES = ["Daily", "Weekly", "Monthly"];

/** How often a weekly debit repeats. */
export const WEEK_INTERVALS = ["Every week", "Every 2 weeks", "Every 4 weeks"];

/** Quick-fill fractions of the saved balance on the withdraw amount screen. */
export const WITHDRAW_PERCENTAGES = [25, 50, 75, 100] as const;

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

/** The individual flow draws from the same USD/NGN wallets as lock. */
export const TARGET_SOURCES: FundingSource[] = [
  { id: "usd", label: "USD Balance", balance: "$0.00", icon: "dollar" },
  { id: "ngn", label: "NGN Balance", balance: "₦0.00", icon: "naira" },
];

/*
 * The intro sheets quote the same range the product cards and the term chips
 * do — they used to say "Earn 0.6% daily" (219% a year), which contradicted
 * every other figure on the screen behind them.
 */

/** Terms for Individual / Target savings (relaxed terms with no early break fee). */
export const INDIVIDUAL_SAVINGS_TERMS = [
  `Earn ${rateRange("individual")} a year on your savings`,
  "Deposit at your own pace to reach your goal",
  "Withdraw anytime with no break fees",
];

/** Terms for Locked savings (fixed commitment with early break fee). */
export const LOCK_SAVINGS_TERMS = [
  `Earn ${rateRange("lock")} a year — the longer the lock, the higher the rate`,
  "You can only make withdrawal after you crossed 50% on your saving goal",
  "You will pay a break fee of 5% if you want to withdraw before the maturity date",
];

/** Backwards-compatible alias */
export const SAVINGS_TERMS = INDIVIDUAL_SAVINGS_TERMS;

export const CIRCLE_TERMS = [
  `Earn ${rateRange("circle")} a year on the circle's savings`,
  "Withdrawals require group consensus after 50% of goal",
  "You will pay a break fee of 5% if you withdraw before the maturity date",
];

/** Placeholder invite link for a circle. */
export const CIRCLE_INVITE = "jumpa.app/circle/abc123";

/** A date the placeholder screens quote as the maturity date. */
export const DEFAULT_MATURITY = "2026/09/27";

/** A circle an invite resolves to, as the join screen prints it. */
export type JoinableCircle = {
  name: string;
  target: string;
  members: number;
  /** Already in the design's `2026/09/27` form. */
  targetDate: string;
};

/**
 * PLACEHOLDER — no service resolves an invite yet, so one circle answers to
 * its own name, its link and the code at the end of it. Replace the whole map
 * with the invite lookup when the API lands.
 */
const JOINABLE: Record<string, JoinableCircle> = {
  "december trip": {
    name: "December Trip",
    target: "₦500,000",
    members: 5,
    targetDate: DEFAULT_MATURITY,
  },
};

/** The link's last segment, so `jumpa.app/circle/abc123` and `abc123` agree. */
const INVITE_CODE = CIRCLE_INVITE.split("/").pop() ?? "";

/** TODO(backend): resolve a name or invite link through the circles API. */
export function findCircle(ref: string): JoinableCircle | null {
  const key = ref.trim().toLowerCase();
  if (!key) return null;
  if (key === CIRCLE_INVITE || key === INVITE_CODE)
    return JOINABLE["december trip"];
  return JOINABLE[key] ?? null;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** `YYYY-MM-DD`, so the value drops straight into a `<input type="date">`. */
export function addDays(days: number, from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Whole days between two `YYYY-MM-DD` values. Every quoted rate is a function
 * of a day count, so the three create flows have to measure one the same way.
 */
export function daysBetween(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso.replace(/-/g, "/")).getTime();
  const end = new Date(endIso.replace(/-/g, "/")).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

/** `2026/09/27` — how the design prints a date outside an input. */
export function displayDate(iso: string): string {
  return iso.replace(/-/g, "/");
}

/** "September 27, 2026" — the form the warning and review quote. */
export function longDate(iso: string): string {
  const [year, month, day] = iso.split(/[/-]/).map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "Sep 27" — the short form the yield row quotes. */
export function shortDate(iso: string): string {
  const [year, month, day] = iso.split(/[/-]/).map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
