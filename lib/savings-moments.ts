import type { GlyphName } from "@/lib/moment-glyphs";
import type { SavingsKind } from "@/lib/savings";
import {
  dayNumber,
  formatMoney,
  goalProgress,
  goalShare,
  HUB_KINDS,
  type HubGoal,
  isoDay,
} from "@/lib/savings-hub";
import { SITE } from "@/lib/seo";

/**
 * Milestones, weekly streaks and badges for the savings hub — all derived from
 * the plans themselves and never stored, so the backend only has to return
 * plans and activity. Privacy first: a share caption never carries an amount.
 */

/* ------------------------------------------------------------ Milestones -- */

export const MILESTONES = [25, 50, 75, 100] as const;
export type Milestone = (typeof MILESTONES)[number];

const MILESTONE_COPY: Record<
  SavingsKind,
  Record<
    Milestone,
    { headline: string; detail: (name: string) => string; caption: string }
  >
> = {
  individual: {
    25: {
      headline: "A quarter of the way",
      detail: (name) => `You've saved a quarter of ${name}. Nice start.`,
      caption: "A quarter of the way to my {name} goal.",
    },
    50: {
      headline: "Halfway there",
      detail: (name) =>
        `Half of ${name} is saved. The second half goes quicker.`,
      caption: "Halfway to my {name} goal.",
    },
    75: {
      headline: "Three quarters in",
      detail: (name) => `Three quarters of ${name} is saved. Nearly there.`,
      caption: "Three quarters of the way to my {name} goal.",
    },
    100: {
      headline: "Goal reached",
      detail: (name) => `${name} is fully saved. You did it.`,
      caption: "I reached my {name} goal.",
    },
  },
  lock: {
    25: {
      headline: "A quarter of the term",
      detail: (name) => `A quarter of ${name}'s term is behind you.`,
      caption: "My {name} lock is a quarter of the way through.",
    },
    50: {
      headline: "Halfway to unlock",
      detail: (name) => `${name} is halfway to unlocking.`,
      caption: "My {name} lock is halfway to unlocking.",
    },
    75: {
      headline: "Nearly unlocked",
      detail: (name) => `${name} unlocks soon. Hold steady.`,
      caption: "My {name} lock is nearly done.",
    },
    100: {
      headline: "Lock matured",
      detail: (name) => `${name} has matured and is ready to withdraw.`,
      caption: "My {name} lock just matured.",
    },
  },
  circle: {
    25: {
      headline: "A quarter there, together",
      detail: (name) => `Your circle has saved a quarter of ${name}.`,
      caption: "Our {name} circle is a quarter of the way there.",
    },
    50: {
      headline: "Halfway, together",
      detail: (name) => `Your circle is halfway to ${name}.`,
      caption: "Our {name} circle is halfway there.",
    },
    75: {
      headline: "Three quarters, together",
      detail: (name) => `Your circle is three quarters of the way to ${name}.`,
      caption: "Our {name} circle is nearly there.",
    },
    100: {
      headline: "Circle target hit",
      detail: (name) => `Your circle hit the ${name} target together.`,
      caption: "Our {name} circle hit its target.",
    },
  },
};

/** Short names for the track and the story list. */
export const MILESTONE_LABEL: Record<Milestone, string> = {
  25: "25%",
  50: "Halfway",
  75: "75%",
  100: "Goal",
};

/** The highest milestone a plan has passed, or 0 before the first. */
export function reachedMilestone(goal: HubGoal): Milestone | 0 {
  const share = goalShare(goal) * 100;
  let reached: Milestone | 0 = 0;
  for (const mark of MILESTONES) if (share >= mark) reached = mark;
  return reached;
}

export function goalReached(goal: HubGoal): boolean {
  return reachedMilestone(goal) === 100;
}

/** The next milestone a deposit can reach, and how much reaches it. A lock's come with time, so none. */
export function nextMilestone(
  goal: HubGoal,
): { mark: Milestone; needed: number } | null {
  if (goal.kind === "lock" || goal.closed || goal.target <= 0) return null;
  const share = goalShare(goal) * 100;
  const mark = MILESTONES.find((next) => next > share);
  if (!mark) return null;
  return { mark, needed: Math.ceil((goal.target * mark) / 100 - goal.saved) };
}

/** "halfway", "75% of the way" or "to the goal" — the end of "₦X takes you …". */
export function milestonePhrase(mark: Milestone): string {
  if (mark === 50) return "halfway";
  if (mark === 100) return "to the goal";
  return `${mark}% of the way`;
}

/* --------------------------------------------------------------- Streaks -- */

/** Weeks shown on the streak strip, this one included. */
export const STREAK_WINDOW = 12;

export type Streak = {
  /** Weeks in a row with a deposit, up to this one or the last. */
  current: number;
  best: number;
  savedThisWeek: boolean;
  /** Oldest first; the last entry is this week. */
  weeks: boolean[];
};

/** Monday-based week number; 1970-01-01 was a Thursday, hence the 3. */
function weekOf(iso: string): number {
  return Math.floor((dayNumber(iso) + 3) / 7);
}

/**
 * Weeks in a row with at least one deposit of your own, across every plan.
 * This week never breaks a run: until it has a deposit the run is counted up
 * to last week, so nothing is lost before the week is actually over.
 */
export function weeklyStreak(
  goals: HubGoal[],
  today: string = isoDay(new Date()),
): Streak {
  const saved = new Set<number>();
  for (const goal of goals) {
    for (const entry of goal.activity) {
      if (entry.kind === "deposit" && !entry.by) saved.add(weekOf(entry.at));
    }
  }

  const now = weekOf(today);
  const savedThisWeek = saved.has(now);
  let current = 0;
  for (let week = savedThisWeek ? now : now - 1; saved.has(week); week--) {
    current++;
  }

  let best = 0;
  let run = 0;
  let previous = Number.NaN;
  for (const week of [...saved].sort((a, b) => a - b)) {
    run = week === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = week;
  }

  const weeks = Array.from({ length: STREAK_WINDOW }, (_, index) =>
    saved.has(now - (STREAK_WINDOW - 1 - index)),
  );
  return { current, best, savedThisWeek, weeks };
}

export function weeksLabel(weeks: number): string {
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

/** One line under the streak. Never says a streak was lost — only how to start the next. */
export function streakNote(streak: Streak): string {
  if (streak.savedThisWeek) return "You've saved this week. See you next week.";
  if (streak.current > 0) return "Add to any plan this week to keep it going.";
  if (streak.best > 0) {
    return `Your best run is ${weeksLabel(streak.best)}. Any deposit starts a new one.`;
  }
  return "Save in any week to start a streak.";
}

/* ---------------------------------------------------------------- Badges -- */

export type BadgeId =
  | "first-goal"
  | "first-circle"
  | "consistent-saver"
  | "goal-completed"
  | "circle-completed";

/** Weeks in a row that earn Consistent Saver. */
export const CONSISTENT_WEEKS = 4;

const BADGES: readonly {
  id: BadgeId;
  name: string;
  glyph: GlyphName;
  hint: string;
}[] = [
  {
    id: "first-goal",
    name: "First Goal",
    glyph: "flag",
    hint: "Start your first savings goal",
  },
  {
    id: "first-circle",
    name: "First Circle",
    glyph: "users",
    hint: "Start a circle with friends",
  },
  {
    id: "consistent-saver",
    name: "Consistent Saver",
    glyph: "medal",
    hint: `Save ${CONSISTENT_WEEKS} weeks in a row`,
  },
  {
    id: "goal-completed",
    name: "Goal Completed",
    glyph: "trophy",
    hint: "Reach a goal's target",
  },
  {
    id: "circle-completed",
    name: "Circle Completed",
    glyph: "party",
    hint: "Hit a circle's target together",
  },
];

export type Badge = (typeof BADGES)[number] & {
  earned: boolean;
  /** How far along a badge still to earn is, when that can be counted. */
  progress?: string;
};

export function badgesFor(
  goals: HubGoal[],
  streak: Streak = weeklyStreak(goals),
): Badge[] {
  const plans = goals.filter((goal) => goal.kind !== "circle");
  const circles = goals.filter((goal) => goal.kind === "circle");
  const completed = (goal: HubGoal) =>
    goalReached(goal) && !goal.closed?.forfeited;

  const earned: Record<BadgeId, boolean> = {
    "first-goal": plans.length > 0,
    "first-circle": circles.length > 0,
    "consistent-saver": streak.best >= CONSISTENT_WEEKS,
    "goal-completed": plans.some(completed),
    "circle-completed": circles.some(completed),
  };

  return BADGES.map((badge) => ({
    ...badge,
    earned: earned[badge.id],
    progress:
      badge.id === "consistent-saver" && !earned[badge.id]
        ? `${streak.current} of ${CONSISTENT_WEEKS} weeks`
        : undefined,
  }));
}

/* --------------------------------------------------------------- Moments -- */

export type Moment =
  | { kind: "started"; goalId: string }
  | { kind: "milestone"; goalId: string; mark: Milestone }
  | { kind: "streak"; weeks: number }
  | { kind: "badge"; badge: BadgeId };

/** What leads when one action earns several: finishing, then progress, then the rest. */
function rank(moment: Moment): number {
  if (moment.kind === "milestone") return moment.mark === 100 ? 0 : 1;
  if (moment.kind === "badge") return 2;
  if (moment.kind === "started") return 3;
  return 4;
}

/**
 * What an action just earned, most important first — new plans, milestones
 * crossed (only the highest, if a deposit crosses two), a streak that grew,
 * and badges unlocked. Comparing states means nothing celebrates twice.
 * TODO(backend): a lock reaches its milestones by time, not by an action, so
 * those only show up once seen moments are stored and checked on open.
 */
export function newMoments(before: HubGoal[], after: HubGoal[]): Moment[] {
  const moments: Moment[] = [];
  const previous = new Map(before.map((goal) => [goal.id, goal]));

  for (const goal of after) {
    if (goal.closed) continue;
    const prior = previous.get(goal.id);
    if (!prior) {
      moments.push({ kind: "started", goalId: goal.id });
      continue;
    }
    const mark = reachedMilestone(goal);
    if (mark && mark > reachedMilestone(prior)) {
      moments.push({ kind: "milestone", goalId: goal.id, mark });
    }
  }

  const streakBefore = weeklyStreak(before);
  const streakAfter = weeklyStreak(after);
  // A run of one is just a deposit; two weeks is the first thing worth saying.
  if (streakAfter.current > streakBefore.current && streakAfter.current >= 2) {
    moments.push({ kind: "streak", weeks: streakAfter.current });
  }

  const had = new Set(
    badgesFor(before, streakBefore)
      .filter((badge) => badge.earned)
      .map((badge) => badge.id),
  );
  for (const badge of badgesFor(after, streakAfter)) {
    if (badge.earned && !had.has(badge.id)) {
      moments.push({ kind: "badge", badge: badge.id });
    }
  }

  return moments.sort((a, b) => rank(a) - rank(b));
}

/** The moment a plan's share button shares: its latest milestone, or its start. */
export function goalMoment(goal: HubGoal): Moment {
  const mark = reachedMilestone(goal);
  return mark
    ? { kind: "milestone", goalId: goal.id, mark }
    : { kind: "started", goalId: goal.id };
}

/** Milestones worth sharing again from the story, furthest along first. */
export function milestoneMoments(goals: HubGoal[], limit = 3): Moment[] {
  return goals
    .filter((goal) => reachedMilestone(goal) && !goal.closed?.forfeited)
    .sort((a, b) => goalShare(b) - goalShare(a))
    .slice(0, limit)
    .map(goalMoment);
}

export function momentKey(moment: Moment): string {
  switch (moment.kind) {
    case "started":
      return `started:${moment.goalId}`;
    case "milestone":
      return `milestone:${moment.goalId}:${moment.mark}`;
    case "streak":
      return `streak:${moment.weeks}`;
    case "badge":
      return `badge:${moment.badge}`;
  }
}

/* ------------------------------------------------------------------ Cards -- */

export type MomentArt =
  | { type: "ring"; progress: number; mark: Milestone; unit: string }
  | { type: "streak"; weeks: boolean[] }
  | { type: "badge"; glyph: GlyphName };

/** Everything a moment says, once — the sheet and the share image both read it. */
export type MomentCard = {
  key: string;
  eyebrow: string;
  headline: string;
  /** The plan or badge the card is about. */
  subject: string;
  /** The sentence under the headline in the sheet. */
  detail: string;
  /** A chip's worth, for "also earned". */
  short: string;
  art: MomentArt;
  /** Drawn only when the person opts in. */
  amounts?: string;
  /** The text that travels with a share. Never carries an amount. */
  caption: string;
  /** Finishing a plan earns the burst and the "next goal" prompt. */
  complete: boolean;
  confetti: boolean;
  /** Analytics label. */
  label: string;
  /** The kind of plan, so "Start your next goal" opens the same form. */
  kind?: SavingsKind;
};

const SIGN_OFF = `Saving with Jumpa: ${SITE.replace(/^https?:\/\//, "")}`;

function caption(line: string): string {
  return `${line} ${SIGN_OFF}`;
}

/** The card for a moment, or null when its plan is gone. */
export function momentCard(
  moment: Moment,
  goals: HubGoal[],
): MomentCard | null {
  const key = momentKey(moment);

  if (moment.kind === "streak") {
    const streak = weeklyStreak(goals);
    const weeks = weeksLabel(moment.weeks);
    return {
      key,
      eyebrow: "Saving streak",
      headline: `${moment.weeks} weeks in a row`,
      subject: "Saving every week",
      detail: `You've added to your savings ${weeks} running. Small and steady wins.`,
      short: `${weeks} streak`,
      art: { type: "streak", weeks: streak.weeks },
      caption: caption(`${weeks} in a row of saving.`),
      complete: false,
      confetti: true,
      label: "streak",
    };
  }

  if (moment.kind === "badge") {
    const badge = badgesFor(goals).find((entry) => entry.id === moment.badge);
    if (!badge) return null;
    return {
      key,
      eyebrow: "Badge unlocked",
      headline: badge.name,
      subject: badge.hint,
      detail: `${badge.hint} — done. It's on your badge shelf now.`,
      short: `${badge.name} badge`,
      art: { type: "badge", glyph: badge.glyph },
      caption: caption(`Just unlocked the ${badge.name} badge.`),
      complete: false,
      confetti: true,
      label: `badge_${badge.id}`,
    };
  }

  const goal = goals.find((entry) => entry.id === moment.goalId);
  if (!goal) return null;
  const amounts =
    goal.kind === "lock"
      ? `${formatMoney(goal.saved, goal.currency)} locked`
      : `${formatMoney(goal.saved, goal.currency)} of ${formatMoney(goal.target, goal.currency)}`;

  if (moment.kind === "started") {
    return {
      key,
      eyebrow: "New plan",
      headline: "Just started",
      subject: goal.name,
      detail: `${goal.name} is open. Every deposit moves it along.`,
      short: "New plan",
      art: { type: "badge", glyph: "sparkle" },
      amounts,
      caption: caption(
        goal.kind === "circle"
          ? `We just started saving for ${goal.name}.`
          : `Just started saving for ${goal.name}.`,
      ),
      complete: false,
      confetti: false,
      label: "started",
      kind: goal.kind,
    };
  }

  const copy = MILESTONE_COPY[goal.kind][moment.mark];
  return {
    key,
    eyebrow: moment.mark === 100 ? "Goal complete" : "Milestone",
    headline: copy.headline,
    subject: goal.name,
    detail: copy.detail(goal.name),
    short: `${MILESTONE_LABEL[moment.mark]} on ${goal.name}`,
    art: {
      type: "ring",
      progress: goalProgress(goal),
      mark: moment.mark,
      unit: goal.kind === "lock" ? "of term" : "saved",
    },
    amounts,
    caption: caption(copy.caption.replace("{name}", goal.name)),
    complete: moment.mark === 100,
    confetti: true,
    label: `milestone_${moment.mark}`,
    kind: goal.kind,
  };
}

/** "Flexible", "Locked" or "Circle" — the plan's pill, for rows that name a plan. */
export function kindPill(kind: SavingsKind): string {
  return HUB_KINDS[kind].pill;
}
