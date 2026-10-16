/**
 * When the support team is at work, and the working-time maths the claim alert
 * runs on. The dashboard sets the hand-to-team SLA (24 working hours) the same way.
 *
 * TODO(product): hours are the client's 08:00–18:00; the timezone (Lagos) and
 * weekdays-only are assumptions — confirm both, then change only this block.
 */
export const SUPPORT_HOURS = {
  timeZone: "Africa/Lagos",
  /** Local hour the queue opens and closes. */
  open: 8,
  close: 18,
  /** 0 = Sunday … 6 = Saturday. */
  days: [1, 2, 3, 4, 5],
  /** Shown beside every time we print, so a user abroad is not misled. */
  zoneLabel: "WAT",
} as const;

/** How long an escalated ticket may sit unclaimed before the team is pinged again. */
export const CLAIM_ALERT_MINUTES = 10;

const MINUTE = 60_000;

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: SUPPORT_HOURS.timeZone,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
  hourCycle: "h23",
});

/** Wall-clock reading of an instant in the support timezone. */
function localParts(at: Date): LocalParts {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(at).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAY[parts.weekday] ?? 0,
  };
}

/** The instant a wall-clock time in the support timezone occurs. */
function zonedInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour);
  const seen = localParts(new Date(guess));
  const drift =
    Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute) -
    guess;
  return new Date(guess - drift);
}

/** Today's opening and closing instants, or null on a day the team is off. */
function shiftOn(year: number, month: number, day: number, weekday: number) {
  if (!(SUPPORT_HOURS.days as readonly number[]).includes(weekday)) return null;
  return {
    start: zonedInstant(year, month, day, SUPPORT_HOURS.open),
    end: zonedInstant(year, month, day, SUPPORT_HOURS.close),
  };
}

/** Walks forward one local day at a time. Two weeks covers any sane SLA. */
function* shiftsFrom(at: Date) {
  const first = localParts(at);
  const noon = zonedInstant(first.year, first.month, first.day, 12);
  for (let offset = 0; offset < 14; offset++) {
    const day = localParts(
      new Date(noon.getTime() + offset * 24 * 60 * MINUTE),
    );
    const shift = shiftOn(day.year, day.month, day.day, day.weekday);
    if (shift) yield shift;
  }
}

export function isWithinSupportHours(at: Date = new Date()): boolean {
  const shift = shiftsFrom(at).next().value;
  return !!shift && at >= shift.start && at < shift.end;
}

/** The next time the queue opens; `at` itself when it is already open. */
export function nextSupportOpening(at: Date = new Date()): Date {
  for (const shift of shiftsFrom(at)) {
    if (at < shift.end) return at > shift.start ? at : shift.start;
  }
  return at;
}

/** `minutes` of working time after `from`, skipping nights and days off. */
export function addSupportMinutes(from: Date, minutes: number): Date {
  let remaining = minutes * MINUTE;
  for (const shift of shiftsFrom(from)) {
    if (from >= shift.end) continue;
    const start = from > shift.start ? from : shift.start;
    const available = shift.end.getTime() - start.getTime();
    if (remaining <= available) return new Date(start.getTime() + remaining);
    remaining -= available;
  }
  // Only reached for an SLA longer than two weeks of shifts.
  return new Date(from.getTime() + minutes * MINUTE);
}

/** Working minutes between two instants — nights and days off count as zero. */
export function supportMinutesBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let total = 0;
  for (const shift of shiftsFrom(from)) {
    if (shift.start >= to) break;
    const start = from > shift.start ? from : shift.start;
    const end = to < shift.end ? to : shift.end;
    if (end > start) total += end.getTime() - start.getTime();
  }
  return total / MINUTE;
}

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: SUPPORT_HOURS.timeZone,
  hour: "numeric",
  minute: "2-digit",
});

const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: SUPPORT_HOURS.timeZone,
  weekday: "long",
});

/** "8:00 AM WAT today", "8:00 AM WAT tomorrow", "8:00 AM WAT Monday". */
export function describeSupportTime(at: Date, now: Date = new Date()): string {
  const target = localParts(at);
  const today = localParts(now);
  const tomorrow = localParts(new Date(now.getTime() + 24 * 60 * MINUTE));
  const same = (a: LocalParts, b: LocalParts) =>
    a.year === b.year && a.month === b.month && a.day === b.day;

  const when = same(target, today)
    ? "today"
    : same(target, tomorrow)
      ? "tomorrow"
      : dayFormat.format(at);
  return `${timeFormat.format(at)} ${SUPPORT_HOURS.zoneLabel} ${when}`;
}

/** "Mon–Fri, 8:00 AM – 6:00 PM WAT", derived so it can never disagree with the config. */
export function describeSupportHours(): string {
  const at = (hour: number) =>
    timeFormat.format(zonedInstant(2026, 1, 5, hour));
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = SUPPORT_HOURS.days;
  const span =
    days.length > 1
      ? `${names[days[0]]}–${names[days[days.length - 1]]}`
      : names[days[0]];
  return `${span}, ${at(SUPPORT_HOURS.open)} – ${at(SUPPORT_HOURS.close)} ${SUPPORT_HOURS.zoneLabel}`;
}
