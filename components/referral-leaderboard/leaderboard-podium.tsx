import { InitialsAvatar } from "@/components/referral-leaderboard/initials-avatar";
import { cn } from "@/lib/cn";
import { REFERRAL_CHALLENGE } from "@/lib/landing";
import type { LeaderboardEntry } from "@/lib/referrals/leaderboard";
import { formatRewardNaira } from "@/lib/referrals/rules";

/** Per place: where it sits (2nd left, 1st centre and raised, 3rd right), its medal and disc. */
const PLACES: Record<
  number,
  { slot: string; medal: string; avatar: string; featured: boolean }
> = {
  1: {
    slot: "order-2",
    medal: "bg-jumpa-medal-gold",
    avatar: "bg-jumpa-white/20 text-jumpa-white",
    featured: true,
  },
  2: {
    slot: "order-1 mt-16 md:mt-61",
    medal: "bg-jumpa-medal-silver",
    avatar: "bg-jumpa-alt-200 text-jumpa-ink",
    featured: false,
  },
  3: {
    slot: "order-3 mt-26 md:mt-100",
    medal: "bg-jumpa-medal-bronze",
    avatar: "bg-jumpa-peach-100 text-jumpa-peach-700",
    featured: false,
  },
};

/** The top three, in rank order in the markup and podium order on screen. */
export function LeaderboardPodium({
  entries,
}: {
  entries: LeaderboardEntry[];
}) {
  const { board } = REFERRAL_CHALLENGE;
  return (
    <ol className="mt-28 flex w-362 items-start justify-center gap-8 md:mt-50 md:w-1126 md:gap-26">
      {entries.slice(0, 3).map((entry) => {
        const place = PLACES[entry.rank];
        return (
          <li
            key={entry.rank}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center rounded-u-16 px-8 pt-14 pb-14 text-center md:rounded-u-22 md:px-40 md:pt-26 md:pb-26",
              place.slot,
              place.featured
                ? "bg-linear-to-b from-jumpa-primary-600 to-jumpa-primary-400 text-jumpa-white"
                : "bg-jumpa-white text-jumpa-ink",
            )}
          >
            <span
              className={cn(
                "flex size-26 items-center justify-center rounded-full font-bold text-jumpa-white text-u-12/16 md:size-43 md:text-u-17/22",
                place.medal,
              )}
            >
              {entry.rank}
            </span>
            <InitialsAvatar
              initials={entry.initials}
              tone={place.avatar}
              className="mt-8 size-48 text-u-16/20 md:mt-11 md:size-76 md:text-u-26/32"
            />
            <span className="mt-10 w-full truncate font-semibold text-u-13/18 md:mt-14 md:text-u-22/28">
              {entry.name}
            </span>
            <span
              className={cn(
                "mt-2 text-u-10/14 md:mt-4 md:text-u-15/20",
                place.featured ? "text-jumpa-white/80" : "text-jumpa-ink-muted",
              )}
            >
              {board.progress(entry.referrals, entry.invited)}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "mt-10 h-px w-full md:mt-20",
                place.featured ? "bg-jumpa-white/25" : "bg-jumpa-lavender-200",
              )}
            />
            <span
              className={cn(
                "mt-10 font-bold text-u-17/22 -tracking-u-0.5 md:mt-20 md:text-u-38/44 md:-tracking-u-1",
                place.featured
                  ? "text-jumpa-alt-400"
                  : "text-jumpa-primary-600",
              )}
            >
              {formatRewardNaira(entry.earned)}
            </span>
            <span
              className={cn(
                "text-u-10/14 md:text-u-13/16",
                place.featured ? "text-jumpa-white/80" : "text-jumpa-ink-muted",
              )}
            >
              {board.earned}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
