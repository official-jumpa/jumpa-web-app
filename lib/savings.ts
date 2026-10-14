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
  status: "Active" | "Matured" | "Closed" | "Completed" | "Paused";
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


/**
 * Balance the masthead shows on a product's own landing. The rate is no longer
 * stored here — it comes from `rateRange(kind)`, so the hero, the product cards
 * and the term chips cannot quote different numbers.
 */
export const SAVINGS_BALANCE: Record<
  SavingsKind,
  { badge: string; amount: string }
> = {
  individual: { badge: "Individual Savings", amount: "0.00" },
  lock: { badge: "Locked Savings", amount: "0.00" },
  circle: { badge: "Group Savings", amount: "0.00" },
};

export const SAVINGS_CATEGORIES = [
  "Rent",
  "Travel",
  "School fees",
  "New car",
  "Other",
];


/** The hub's term picker: whole months, with the twelfth as a full year. */
export const MONTH_TERMS: readonly { months: number; days: number }[] =
  Array.from({ length: 12 }, (_, index) => ({
    months: index + 1,
    days: index === 11 ? 365 : (index + 1) * 30,
  }));

/** "1 month", "6 months", or "No deadline" for an open-ended goal. */
export function termName(days: number | null): string {
  if (days === null) return "No deadline";
  const term = MONTH_TERMS.find((option) => option.days === days);
  if (!term) return `${days} days`;
  return `${term.months} ${term.months === 1 ? "month" : "months"}`;
}

/**
 * Tiered APY schedule by commitment days and product kind.
 * Rates resolved via `apyForDays` are locked into the database at plan creation.
 */
type RateBand = { minDays: number; apy: number };

const RATE_BANDS: Record<SavingsKind, RateBand[]> = {
  individual: [
    { minDays: 0, apy: 2.0 },
    { minDays: 30, apy: 2.25 },
    { minDays: 60, apy: 2.5 },
    { minDays: 90, apy: 2.75 },
    { minDays: 120, apy: 3.0 },
    { minDays: 150, apy: 3.25 },
    { minDays: 180, apy: 3.5 },
    { minDays: 210, apy: 3.75 },
    { minDays: 240, apy: 4.0 },
    { minDays: 270, apy: 4.25 },
    { minDays: 300, apy: 4.5 },
    { minDays: 330, apy: 4.75 },
    { minDays: 365, apy: 5.0 },
  ],
  lock: [
    { minDays: 30, apy: 5.0 },
    { minDays: 60, apy: 6.0 },
    { minDays: 90, apy: 7.0 },
    { minDays: 120, apy: 8.0 },
    { minDays: 150, apy: 9.0 },
    { minDays: 180, apy: 10.0 },
    { minDays: 210, apy: 11.0 },
    { minDays: 240, apy: 12.0 },
    { minDays: 270, apy: 12.75 },
    { minDays: 300, apy: 13.5 },
    { minDays: 330, apy: 14.25 },
    { minDays: 365, apy: 15.0 },
  ],
  circle: [
    { minDays: 0, apy: 3.0 },
    { minDays: 30, apy: 3.5 },
    { minDays: 60, apy: 4.0 },
    { minDays: 90, apy: 4.75 },
    { minDays: 120, apy: 5.5 },
    { minDays: 150, apy: 6.25 },
    { minDays: 180, apy: 7.0 },
    { minDays: 210, apy: 7.75 },
    { minDays: 240, apy: 8.5 },
    { minDays: 270, apy: 9.0 },
    { minDays: 300, apy: 9.35 },
    { minDays: 330, apy: 9.7 },
    { minDays: 365, apy: 10.0 },
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

/** "15%" or "14.49%" — the best a product pays, short enough for a corner badge. */
export function topRate(kind: SavingsKind): string {
  const best = Math.max(...RATE_BANDS[kind].map((band) => band.apy));
  // Number() drops the trailing zeros toFixed leaves: 15.00 → 15.
  return `${Number(best.toFixed(2))}%`;
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

/** Terms for Locked savings (fixed commitment; early withdrawal forfeits accrued interest). */
export const LOCK_SAVINGS_TERMS = [
  `Earn ${rateRange("lock")} a year — the longer the lock, the higher the rate`,
  "Lock your funds until your chosen maturity date",
  "Early withdrawal before maturity forfeits accrued interest",
];

/** Backwards-compatible alias */
export const SAVINGS_TERMS = INDIVIDUAL_SAVINGS_TERMS;

export const CIRCLE_TERMS = [
  `Earn ${rateRange("circle")} a year on the circle's savings`,
  "Save together with friends towards a shared goal",
  "Withdrawal anytime you want or when the circle owner decides",
];

/** Placeholder invite link for a circle. */
export const CIRCLE_INVITE = "jumpa.app/circle/abc123";


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
