import { TZDate } from "@date-fns/tz";
import type { AutoSaveDraft } from "@/lib/savings-auto-save";

/** When a rule runs: its cadence fields plus the saver's own time zone. */
export type AutoSaveSchedule = Pick<
  AutoSaveDraft,
  "cadence" | "weekday" | "monthDay" | "intervalMinutes" | "time"
> & { timeZone: string };

const MINUTE_MS = 60_000;
/** Any monthly day comes round within two months. */
const SEARCH_DAYS = 62;

/**
 * The first run strictly after `after`. Runs missed while the job was down
 * are skipped, never caught up, so one late job never debits twice.
 * A custom gap counts from `anchor` (the run just made) so it does not drift.
 */
export function nextAutoSaveRun(
  schedule: AutoSaveSchedule,
  after: Date,
  anchor: Date = after,
): Date {
  if (schedule.cadence === "custom") {
    const gap = schedule.intervalMinutes * MINUTE_MS;
    const missed = Math.max(
      0,
      Math.floor((after.getTime() - anchor.getTime()) / gap),
    );
    return new Date(anchor.getTime() + (missed + 1) * gap);
  }

  const [hours, minutes] = schedule.time.split(":").map(Number);
  const today = new TZDate(after.getTime(), schedule.timeZone);
  for (let offset = 0; offset <= SEARCH_DAYS; offset++) {
    const run = new TZDate(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + offset,
      hours,
      minutes,
      schedule.timeZone,
    );
    if (run.getTime() > after.getTime() && runsOn(schedule, run)) {
      return new Date(run.getTime());
    }
  }
  throw new Error(`No ${schedule.cadence} auto-save run found`);
}

/** Whether a rule runs on this local day. Day 29 to 31 fall back to a short month's last day. */
function runsOn(schedule: AutoSaveSchedule, day: TZDate): boolean {
  if (schedule.cadence === "weekly") return day.getDay() === schedule.weekday;
  if (schedule.cadence === "monthly") {
    const lastDay = new TZDate(
      day.getFullYear(),
      day.getMonth() + 1,
      0,
      schedule.timeZone,
    ).getDate();
    return day.getDate() === Math.min(schedule.monthDay, lastDay);
  }
  return true;
}

/** An IANA zone the server can schedule in, e.g. `Africa/Lagos`. */
export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
