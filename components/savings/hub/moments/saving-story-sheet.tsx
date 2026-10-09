"use client";

import { type CSSProperties, useMemo, useState } from "react";
import { ShareArrowIcon } from "@/components/ui/icons/share-arrow";
import { SheetPortal } from "@/components/ui/sheet-portal";
import type { HubGoal } from "@/lib/savings-hub";
import {
  type Badge,
  badgesFor,
  type Moment,
  type MomentCard,
  milestoneMoments,
  momentCard,
  STREAK_WINDOW,
  type Streak,
  streakNote,
  weeklyStreak,
  weeksLabel,
} from "@/lib/savings-moments";
import { MomentGlyph } from "./moment-glyph";

/**
 * Streak, badges and milestones in one place — kept off the hub so it stays
 * quiet, and opened from the header's streak pill. Every share opens the
 * moment sheet for that card.
 */
export function SavingStorySheet({
  goals,
  onClose,
  onShare,
}: {
  goals: HubGoal[];
  onClose: () => void;
  onShare: (moment: Moment) => void;
}) {
  const streak = useMemo(() => weeklyStreak(goals), [goals]);
  const badges = useMemo(() => badgesFor(goals, streak), [goals, streak]);
  const milestones = useMemo(
    () =>
      milestoneMoments(goals)
        .map((moment) => ({ moment, card: momentCard(moment, goals) }))
        .filter(
          (entry): entry is { moment: Moment; card: MomentCard } =>
            entry.card !== null,
        ),
    [goals],
  );

  return (
    <SheetPortal onClose={onClose}>
      <div className="flex flex-col gap-6 pt-1 pb-2">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h2 className="text-xl leading-6 font-semibold text-jumpa-black">
            Your savings story
          </h2>
          <p className="max-w-72 text-xs leading-4 text-jumpa-neutral-500">
            Any deposit in any plan counts. Badges are yours to keep.
          </p>
        </div>

        <StreakPanel
          streak={streak}
          onShare={() => onShare({ kind: "streak", weeks: streak.current })}
        />

        <BadgeShelf
          badges={badges}
          onShare={(badge) => onShare({ kind: "badge", badge: badge.id })}
        />

        {milestones.length ? (
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-jumpa-black">Milestones</h3>
            <ul className="flex flex-col gap-2">
              {milestones.map(({ moment, card }) => (
                <li key={card.key}>
                  <MilestoneRow card={card} onShare={() => onShare(moment)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </SheetPortal>
  );
}

function StreakPanel({
  streak,
  onShare,
}: {
  streak: Streak;
  onShare: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-surface bg-[image:var(--gradient-jumpa-receipt)] p-4 text-jumpa-white">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-10 size-36 rounded-full bg-jumpa-alt-400/25 blur-2xl"
      />

      <div className="relative flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-jumpa-alt-400 text-jumpa-primary-950">
          <MomentGlyph name="flame" className="size-7" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
          <span className="text-[11px] leading-3.5 text-jumpa-primary-100">
            Saving streak
          </span>
          <span className="text-2xl leading-7 font-semibold">
            {streak.current ? weeksLabel(streak.current) : "Not started"}
          </span>
        </span>
        {/* A run of one is just a deposit; two weeks is the first worth posting. */}
        {streak.current >= 2 ? (
          <button
            type="button"
            onClick={onShare}
            className="tap flex h-8 shrink-0 items-center gap-1.5 rounded-pill bg-jumpa-white/15 px-3 text-xs font-medium active:scale-95"
          >
            <ShareArrowIcon className="size-4" />
            Share
          </button>
        ) : null}
      </div>

      <p className="relative mt-3 text-xs leading-4 text-jumpa-primary-100">
        {streakNote(streak)}
      </p>

      <div className="relative mt-4 flex items-center justify-between">
        {streak.weeks.map((saved, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: one dot per week, fixed order
            key={index}
            className={`stagger size-3.5 animate-pop-in rounded-full ${
              saved ? "bg-jumpa-alt-400" : "bg-jumpa-white/20"
            } ${
              index === STREAK_WINDOW - 1
                ? "outline-2 outline-offset-2 outline-jumpa-white/70"
                : ""
            }`}
            style={{ "--i": index } as CSSProperties}
          />
        ))}
      </div>
      <div className="relative mt-2.5 flex justify-between text-[10px] leading-3 text-jumpa-primary-100">
        <span>{STREAK_WINDOW} weeks ago</span>
        {streak.best ? <span>Best: {weeksLabel(streak.best)}</span> : null}
        <span>This week</span>
      </div>
    </section>
  );
}

function BadgeShelf({
  badges,
  onShare,
}: {
  badges: Badge[];
  onShare: (badge: Badge) => void;
}) {
  // Opens on the next one to earn, so the shelf says what to aim for.
  const [picked, setPicked] = useState(
    () => (badges.find((badge) => !badge.earned) ?? badges[0]).id,
  );
  const selected = badges.find((badge) => badge.id === picked) ?? badges[0];
  const earned = badges.filter((badge) => badge.earned).length;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-jumpa-black">Badges</h3>
        <span className="text-[11px] leading-3.5 text-jumpa-neutral-500">
          {earned} of {badges.length}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {badges.map((badge, index) => (
          <button
            key={badge.id}
            type="button"
            aria-pressed={badge.id === picked}
            onClick={() => setPicked(badge.id)}
            className="tap flex min-w-0 flex-col items-center gap-1.5 active:scale-95"
          >
            <span
              className={`stagger flex size-13 animate-pop-in items-center justify-center rounded-full ${
                badge.earned
                  ? "bg-jumpa-alt-400 text-jumpa-primary-950"
                  : "border border-dashed border-jumpa-neutral-200 bg-jumpa-neutral-50 text-jumpa-neutral-300"
              } ${
                badge.id === picked
                  ? "outline-2 outline-offset-2 outline-jumpa-primary-600"
                  : ""
              }`}
              style={{ "--i": index } as CSSProperties}
            >
              <MomentGlyph name={badge.glyph} className="size-6" />
            </span>
            <span
              className={`text-center text-[10px] leading-3 ${
                badge.earned
                  ? "font-medium text-jumpa-black"
                  : "text-jumpa-neutral-500"
              }`}
            >
              {badge.name}
            </span>
          </button>
        ))}
      </div>

      <div
        key={selected.id}
        className="flex animate-fade items-center gap-3 rounded-panel bg-jumpa-neutral-50 px-3.5 py-3"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm leading-4 font-semibold text-jumpa-black">
            {selected.name}
          </span>
          <span className="text-xs leading-4 text-jumpa-neutral-500">
            {selected.earned
              ? `Earned — ${selected.hint.toLowerCase()}`
              : selected.progress
                ? `${selected.hint} · ${selected.progress}`
                : selected.hint}
          </span>
        </span>
        {selected.earned ? (
          <button
            type="button"
            aria-label={`Share the ${selected.name} badge`}
            onClick={() => onShare(selected)}
            className="tap flex size-9 shrink-0 items-center justify-center rounded-full bg-jumpa-white text-jumpa-primary-600 inset-ring-1 inset-ring-jumpa-neutral-100 active:scale-95"
          >
            <ShareArrowIcon className="size-4.5" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

const RING_R = 15;
const RING_C = 2 * Math.PI * RING_R;

function MilestoneRow({
  card,
  onShare,
}: {
  card: MomentCard;
  onShare: () => void;
}) {
  const progress = card.art.type === "ring" ? card.art.progress : 0;

  return (
    <div className="flex items-center gap-3 rounded-panel bg-jumpa-neutral-50 px-3.5 py-3">
      {progress >= 100 ? (
        // "100%" does not fit the ring; a finished goal reads better as a tick.
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-white">
          <MomentGlyph name="check" className="size-5" />
        </span>
      ) : (
        <span className="relative flex size-10 shrink-0 items-center justify-center">
          <svg
            viewBox="0 0 40 40"
            aria-hidden="true"
            focusable="false"
            className="absolute inset-0 -rotate-90"
          >
            <circle
              cx="20"
              cy="20"
              r={RING_R}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-jumpa-primary-100"
            />
            <circle
              cx="20"
              cy="20"
              r={RING_R}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * RING_C} ${RING_C}`}
              className="text-jumpa-primary-600"
            />
          </svg>
          <span className="text-[9px] leading-none font-semibold text-jumpa-primary-950">
            {progress}%
          </span>
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm leading-4 font-semibold text-jumpa-black">
          {card.headline}
        </span>
        <span className="truncate text-xs leading-4 text-jumpa-neutral-500">
          {card.subject}
        </span>
      </span>
      <button
        type="button"
        aria-label={`Share ${card.headline} on ${card.subject}`}
        onClick={onShare}
        className="tap flex size-9 shrink-0 items-center justify-center rounded-full bg-jumpa-white text-jumpa-primary-600 inset-ring-1 inset-ring-jumpa-neutral-100 active:scale-95"
      >
        <ShareArrowIcon className="size-4.5" />
      </button>
    </div>
  );
}
