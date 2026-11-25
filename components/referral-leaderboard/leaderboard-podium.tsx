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
    medal:
      "from-jumpa-medal-gold-light to-jumpa-medal-gold text-jumpa-medal-ink",
    avatar: "bg-jumpa-white/20 text-jumpa-white",
    featured: true,
  },
  2: {
    slot: "order-1 mt-60",
    medal:
      "from-jumpa-medal-silver-light to-jumpa-grey-400 text-jumpa-grey-600",
    avatar: "bg-jumpa-alt-150 text-jumpa-alt-925",
    featured: false,
  },
  3: {
    slot: "order-3 mt-90 md:mt-100",
    medal:
      "from-jumpa-medal-bronze-light to-jumpa-medal-bronze text-jumpa-medal-ink",
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
    <ol className="mt-42 flex items-start justify-center gap-9 md:mt-72 md:gap-24">
      {entries.slice(0, 3).map((entry) => {
        const place = PLACES[entry.rank];
        return (
          <li
            key={entry.rank}
            className={cn(
              "flex h-236 w-112 flex-col items-center rounded-u-24 px-8 pt-14 text-center shadow-lift-u-10/13 md:h-340 md:w-360 md:rounded-u-32 md:px-28 md:pt-22 md:shadow-lift-u-14/18",
              place.slot,
              place.featured
                ? "bg-linear-to-b from-jumpa-primary-450 to-jumpa-primary-800 text-jumpa-white shadow-jumpa-primary-600/30 md:to-jumpa-primary-600"
                : "bg-jumpa-white text-jumpa-ink inset-ring inset-ring-jumpa-secondary-150 shadow-jumpa-primary-600/8",
            )}
          >
            <span
              className={cn(
                "flex size-32 shrink-0 items-center justify-center rounded-full bg-linear-to-b font-extrabold text-u-14/22 md:size-44 md:text-u-18/26",
                place.medal,
              )}
            >
              {entry.rank}
            </span>
            <InitialsAvatar
              initials={entry.initials}
              tone={place.avatar}
              className="mt-10 size-52 font-extrabold text-u-18/24 md:mt-14 md:size-76 md:text-u-26/32"
            />
            <span className="mt-12 w-full truncate font-bold text-u-14/20 md:mt-20 md:text-u-24/28">
              {entry.name}
            </span>
            <span
              className={cn(
                "mt-2 font-medium text-u-12/18 md:hidden",
                place.featured
                  ? "text-jumpa-secondary-150"
                  : "text-jumpa-ink-muted",
              )}
            >
              <span aria-hidden="true">
                {board.progress(entry.referrals, entry.invited)}
              </span>
              <span className="sr-only">
                {board.progressLabel(entry.referrals, entry.invited)}
              </span>
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "mt-12 h-px w-80 shrink-0 md:mt-15",
                place.featured
                  ? "bg-jumpa-white/25 md:w-304"
                  : "bg-jumpa-primary-90 md:w-280",
              )}
            />
            <span
              className={cn(
                "mt-11 font-extrabold text-u-18/24 md:mt-12",
                place.featured
                  ? "text-jumpa-alt-400 md:text-u-44.5/46.75 md:-tracking-u-1.75"
                  : "text-jumpa-primary-600 md:text-u-40/46.75 md:-tracking-u-1.5",
              )}
            >
              {formatRewardNaira(entry.earned)}
            </span>
            <span
              className={cn(
                "mt-2 font-medium text-u-11/16 md:mt-12 md:text-u-16/18 md:-tracking-u-0.25",
                place.featured
                  ? "text-jumpa-secondary-150"
                  : "text-jumpa-ink-muted",
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
