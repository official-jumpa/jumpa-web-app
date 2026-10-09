import { type Streak, weeksLabel } from "@/lib/savings-moments";
import { MomentGlyph } from "./moment-glyph";

/**
 * The hub's only trace of streaks and badges: a flame and a count, which opens
 * the savings story. Lit once this week has a deposit; never shows a loss.
 */
export function StreakButton({
  streak,
  onClick,
}: {
  streak: Streak;
  onClick: () => void;
}) {
  const lit = streak.savedThisWeek;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        streak.current
          ? `Your savings story — ${weeksLabel(streak.current)} streak`
          : "Your savings story"
      }
      className={`tap flex h-9.5 items-center gap-1 rounded-pill border px-2.5 text-sm leading-4 font-semibold transition-colors duration-300 active:scale-95 ${
        lit
          ? "border-jumpa-alt-500 bg-jumpa-alt-400 text-jumpa-primary-950"
          : "border-jumpa-primary-600 bg-jumpa-secondary-150 text-jumpa-primary-600"
      }`}
    >
      <MomentGlyph name="flame" className="size-4.5" />
      <span className="tabular-nums">{streak.current}</span>
    </button>
  );
}
