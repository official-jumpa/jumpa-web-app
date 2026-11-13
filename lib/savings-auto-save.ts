import type { SavingsKind } from "@/lib/savings";
import {
  currencySymbol,
  type SavingsCurrency,
  type SavingsGoal,
} from "@/lib/savings-hub";

/** Auto-save: a standing instruction that tops up one plan on a schedule. */

/**
 * TODO: set to `true` once `npm run auto-save` is scheduled on the host.
 * Until then the entry and its API only work in development, so nobody can
 * switch on a rule that never runs.
 */
export const AUTO_SAVE_LIVE = process.env.NODE_ENV !== "production";

export type AutoSaveCadence = "daily" | "weekly" | "monthly" | "custom";
export type AutoSaveSource = "ngn" | "usdc";

/** What the setup flow collects. */
export type AutoSaveDraft = {
  cadence: AutoSaveCadence;
  /** Whole units of `currency`; 0 until one is entered. */
  amount: number;
  currency: SavingsCurrency;
  source: AutoSaveSource;
  /** 0 (Sunday) to 6. Read only on a weekly rule. */
  weekday: number;
  /** 1 to 28, or `LAST_DAY`. Read only on a monthly rule. */
  monthDay: number;
  /** Gap between runs, in minutes. Read only on a custom rule. */
  intervalMinutes: number;
  /** Wall-clock time in the saver's own zone, `HH:mm`. */
  time: string;
};

/** A saved rule. A plan has at most one. The run times are ISO strings from the server. */
export type AutoSaveRule = AutoSaveDraft & {
  goalId: string;
  paused: boolean;
  nextRunAt?: string;
  lastRunAt?: string | null;
};

/** Stands for a month's final day, whichever date that is. */
export const LAST_DAY = 31;

const DEFAULT_TIME = "09:30";
const TIME_STEP_MINUTES = 30;
const DEFAULT_INTERVAL_MINUTES = 60;
const MINUTES_PER_DAY = 24 * 60;

/** Flexible plans only: a lock is funded once, and a circle keeps its own rhythm. */
export const AUTO_SAVE_KINDS: readonly SavingsKind[] = ["individual"];

type CadenceCopy = {
  value: AutoSaveCadence;
  title: string;
  caption: string;
  /** "Daily" on the review card, "daily" in a heading. */
  name: string;
  /** "day", as in "each day" and "every day". */
  unit: string;
  /** What the amount comes to: how many runs fit the span, and the span's name. Custom works it out from the gap. */
  projection?: { runs: number; span: string };
};

export const AUTO_SAVE_CADENCES: readonly CadenceCopy[] = [
  {
    value: "daily",
    title: "Every day",
    caption: "A little each sunrise. Small drops, steady stash.",
    name: "Daily",
    unit: "day",
    projection: { runs: 30, span: "a month" },
  },
  {
    value: "weekly",
    title: "Every week",
    caption: "One calm top-up, on the day you pick.",
    name: "Weekly",
    unit: "week",
    projection: { runs: 52, span: "a year" },
  },
  {
    value: "monthly",
    title: "Every month",
    caption: "A single bigger move, timed to payday.",
    name: "Monthly",
    unit: "month",
    projection: { runs: 12, span: "a year" },
  },
  {
    value: "custom",
    title: "Custom",
    caption: "Every few minutes or hours. You set the gap.",
    name: "Custom",
    unit: "time",
  },
];

export function cadenceCopy(cadence: AutoSaveCadence): CadenceCopy {
  return (
    AUTO_SAVE_CADENCES.find((option) => option.value === cadence) ??
    AUTO_SAVE_CADENCES[0]
  );
}

type CurrencyRules = {
  /** Whether a plan in this currency can be auto-saved into yet. */
  live: boolean;
  /** Name on the amount step's switch. */
  label: string;
  /** Most one plan may hold: the ceiling a manual top-up is held to. */
  cap: number;
  /** Shortcut amounts on the amount step. */
  quickAmounts: Record<AutoSaveCadence, readonly number[]>;
};

export const AUTO_SAVE_CURRENCIES: Record<SavingsCurrency, CurrencyRules> = {
  NGN: {
    live: true,
    label: "Naira",
    cap: 1_000_000,
    quickAmounts: {
      daily: [500, 1000, 2000, 5000],
      // TODO: placeholder shortcuts. The design only sets the daily ones.
      weekly: [2000, 5000, 10000, 20000],
      monthly: [5000, 10000, 20000, 50000],
      // TODO: placeholder shortcuts. Custom is not in the design.
      custom: [100, 200, 500, 1000],
    },
  },
  USDC: {
    // TODO: not live. A USDC deposit is signed with the saver's PIN, so it
    // cannot run unattended yet. Flip once that path exists.
    live: false,
    label: "Dollar",
    cap: 1_000,
    // TODO: placeholder shortcuts. Nothing is designed for USDC yet.
    quickAmounts: {
      daily: [1, 2, 5, 10],
      weekly: [5, 10, 20, 50],
      monthly: [10, 20, 50, 100],
      custom: [1, 2, 5, 10],
    },
  },
};

type SourceCopy = {
  value: AutoSaveSource;
  currency: SavingsCurrency;
  title: string;
  /** Shown until the wallet's balance is known. */
  caption: string;
};

const AUTO_SAVE_SOURCES: readonly SourceCopy[] = [
  {
    value: "ngn",
    currency: "NGN",
    title: "Jumpa Naira",
    caption: "Naira, from Jumpa account",
  },
  {
    value: "usdc",
    currency: "USDC",
    title: "Jumpa USDC",
    caption: "USDC, from Jumpa account",
  },
];

export function sourceCopy(source: AutoSaveSource): SourceCopy {
  return (
    AUTO_SAVE_SOURCES.find((option) => option.value === source) ??
    AUTO_SAVE_SOURCES[0]
  );
}

/** Each wallet's balance, already formatted, where it is known. */
export type SourceBalances = Partial<Record<AutoSaveSource, string>>;

/** Line under a wallet's name: its balance once loaded, a description until then. */
export function sourceCaption(
  source: SourceCopy,
  balances: SourceBalances,
): string {
  const balance = balances[source.value];
  return balance ? `Balance ${balance}` : source.caption;
}

/**
 * Wallets offered for a plan: the one in its own currency, then any that is
 * not live yet, marked `soon`. A plan is never funded across currencies.
 */
export function sourcesFor(
  currency: SavingsCurrency,
): (SourceCopy & { soon: boolean })[] {
  return AUTO_SAVE_SOURCES.map((source) => ({
    ...source,
    soon: !AUTO_SAVE_CURRENCIES[source.currency].live,
  }))
    .filter((source) => source.soon || source.currency === currency)
    .sort((a, b) => Number(a.soon) - Number(b.soon));
}

/** `ready` can be set up, `soon` is shown but inert, `none` has no entry at all. */
export type AutoSaveAvailability = "ready" | "soon" | "none";

export function autoSaveAvailability(goal: SavingsGoal): AutoSaveAvailability {
  if (!AUTO_SAVE_LIVE || goal.closed) return "none";
  if (!AUTO_SAVE_KINDS.includes(goal.kind)) return "none";
  return AUTO_SAVE_CURRENCIES[goal.currency].live ? "ready" : "soon";
}

/** How much more a plan can take before its target or the savings ceiling. */
export function roomLeft(goal: SavingsGoal): number {
  const { cap } = AUTO_SAVE_CURRENCIES[goal.currency];
  const toTarget = goal.target > 0 ? goal.target - goal.saved : cap;
  return Math.max(0, Math.min(toTarget, cap - goal.saved));
}

/** Why an amount cannot be saved on repeat, or nothing when it can. */
export function amountError(
  amount: number,
  goal: SavingsGoal,
): string | undefined {
  const room = roomLeft(goal);
  if (amount <= room) return undefined;
  return room > 0
    ? `That is more than the ${formatAutoSaveAmount(room, goal.currency)} left on this plan`
    : "This plan has already reached its target";
}

/** A new rule's starting point: daily, nothing entered, the plan's own wallet. */
export function startDraft(goal: SavingsGoal): AutoSaveDraft {
  return {
    cadence: "daily",
    amount: 0,
    currency: goal.currency,
    source: sourcesFor(goal.currency)[0].value,
    weekday: 1,
    monthDay: 1,
    intervalMinutes: DEFAULT_INTERVAL_MINUTES,
    time: DEFAULT_TIME,
  };
}

/** "2,000": whole amounts drop the decimals the hub's figures carry. */
export function formatWhole(amount: number): string {
  return amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatAutoSaveAmount(
  amount: number,
  currency: SavingsCurrency,
): string {
  return `${currencySymbol(currency)}${formatWhole(amount)}`;
}

/** "That adds up to about ₦60,000 a month": the amount over the next span up. */
export function projectionLabel(
  amount: number,
  rule: Pick<AutoSaveDraft, "cadence" | "intervalMinutes">,
  currency: SavingsCurrency,
): string {
  const { runs, span } = cadenceCopy(rule.cadence).projection ?? {
    runs: Math.floor(MINUTES_PER_DAY / rule.intervalMinutes),
    span: "a day",
  };
  return `That adds up to about ${formatAutoSaveAmount(amount * runs, currency)} ${span}`;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** "09:30" reads "9:30am". */
export function timeLabel(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  return `${hour % 12 || 12}:${pad(minute)}${hour < 12 ? "am" : "pm"}`;
}

function ordinal(day: number): string {
  const teen = day % 100 >= 11 && day % 100 <= 13;
  const suffix = teen ? "th" : (["th", "st", "nd", "rd"][day % 10] ?? "th");
  return `${day}${suffix}`;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type PickerOption = { value: string; label: string };

/** Every half hour of the day, for the time picker. */
export const AUTO_SAVE_TIMES: PickerOption[] = Array.from(
  { length: (24 * 60) / TIME_STEP_MINUTES },
  (_, slot) => {
    const minutes = slot * TIME_STEP_MINUTES;
    const value = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    return { value, label: timeLabel(value) };
  },
);

/** Monday first, the way a working week reads. */
export const AUTO_SAVE_WEEKDAYS: PickerOption[] = [1, 2, 3, 4, 5, 6, 0].map(
  (day) => ({ value: String(day), label: WEEKDAYS[day] }),
);

/** The 1st to the 28th, which every month has, then its last day. */
export const AUTO_SAVE_MONTH_DAYS: PickerOption[] = [
  ...Array.from({ length: 28 }, (_, index) => ({
    value: String(index + 1),
    label: ordinal(index + 1),
  })),
  { value: String(LAST_DAY), label: "Last day" },
];

/** "Every minute", "Every 5 minutes", "Every hour", "Every 2 hours". */
export function intervalLabel(minutes: number): string {
  const hours = minutes / 60;
  if (minutes < 60)
    return minutes === 1 ? "Every minute" : `Every ${minutes} minutes`;
  return hours === 1 ? "Every hour" : `Every ${hours} hours`;
}

/** Gaps a custom rule can repeat on. Vercy runs the job every 5 minutes at most, so none is shorter. */
export const AUTO_SAVE_INTERVAL_MINUTES: readonly number[] = [
  5, 10, 15, 30, 60, 120, 180, 360, 720,
];

export const AUTO_SAVE_INTERVALS: PickerOption[] =
  AUTO_SAVE_INTERVAL_MINUTES.map((minutes) => ({
    value: String(minutes),
    label: intervalLabel(minutes),
  }));

/** "Every day" or "Every 5 minutes": how often money moves, without the day or time. */
export function repeatLabel(
  rule: Pick<AutoSaveDraft, "cadence" | "intervalMinutes">,
): string {
  return rule.cadence === "custom"
    ? intervalLabel(rule.intervalMinutes)
    : `Every ${cadenceCopy(rule.cadence).unit}`;
}

/** "Every day", "Every Monday", "Monthly on the 1st": when a rule runs. */
export function scheduleLabel(
  rule: Pick<
    AutoSaveDraft,
    "cadence" | "weekday" | "monthDay" | "intervalMinutes"
  >,
): string {
  if (rule.cadence === "custom") return intervalLabel(rule.intervalMinutes);
  if (rule.cadence === "weekly") return `Every ${WEEKDAYS[rule.weekday]}`;
  if (rule.cadence === "monthly") {
    return rule.monthDay === LAST_DAY
      ? "Monthly on the last day"
      : `Monthly on the ${ordinal(rule.monthDay)}`;
  }
  return "Every day";
}

/** "₦2,000 · Every day · 9:30am": a whole rule on one line. A custom gap has no time of day. */
export function ruleSummary(rule: AutoSaveDraft): string {
  return [
    formatAutoSaveAmount(rule.amount, rule.currency),
    scheduleLabel(rule),
    ...(rule.cadence === "custom" ? [] : [timeLabel(rule.time)]),
  ].join(" · ");
}
