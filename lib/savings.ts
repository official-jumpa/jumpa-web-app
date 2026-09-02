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

/** What the masthead reports across every product. */
export const SAVINGS_SUMMARY = {
  goals: 3,
  saved: "67,000",
  target: "100,000",
  percent: 67,
  remaining: "3,300",
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
  saved: "$250",
  target: "$1000",
  daysLeft: 43,
  percent: 25,
  startDate: "September 27, 2026",
  endDateLong: "November 27, 2026",
  frequency: "Wednesday, Weekly",
};

/** Placeholder plans; the savings service replaces them. */
export const SAVINGS_PLANS: SavingsPlan[] = [
  { ...DECEMBER_TRIP, id: "december-trip", kind: "individual" },
  { ...DECEMBER_TRIP, id: "december-lock", kind: "lock" },
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
    badge: "Referral Earnings",
    amount: "144,760.21",
    rate: "1.5% p.a.",
  },
  lock: { badge: "Locked savings", amount: "144,760.21", rate: "Rate% p.a." },
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
  icon: "dollar" | "naira" | "crypto" | "stocks";
};

/** Wallets the lock flow can draw from. */
export const LOCK_SOURCES: FundingSource[] = [
  { id: "usd", label: "USD Balance", balance: "$1,800", icon: "dollar" },
  { id: "ngn", label: "NGN Balance", balance: "$500", icon: "naira" },
];

/** The individual flow draws from the investment wallets instead. */
export const TARGET_SOURCES: FundingSource[] = [
  { id: "crypto", label: "Crypto", balance: "$1,800", icon: "crypto" },
  { id: "stocks", label: "Stocks", balance: "$500", icon: "stocks" },
];

/** Terms every intro sheet repeats, in the design's own words. */
export const SAVINGS_TERMS = [
  "Earn 0.6% daily on your Savings",
  "You can only make withdrawal after you crossed 50% on your saving goal",
  "You will pay a break fee of 5% if you want to withdraw before the maturity date",
];

export const CIRCLE_TERMS = [
  "Earn 0.6% daily on your Savings",
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
