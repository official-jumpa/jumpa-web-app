import { Eyebrow } from "@/components/referral-leaderboard/eyebrow";
import { LeaderboardPodium } from "@/components/referral-leaderboard/leaderboard-podium";
import { LeaderboardTable } from "@/components/referral-leaderboard/leaderboard-table";
import { REFERRAL_CHALLENGE, REFERRAL_LEADERBOARD_HREF } from "@/lib/landing";
import {
  LEADERBOARD_PREVIEW,
  type ReferralLeaderboard,
} from "@/lib/referrals/leaderboard";

const PODIUM = 3;

/** Podium, then the table. `board` is null when it couldn't load. */
export function LeaderboardStandings({
  board,
  showAll,
}: {
  board: ReferralLeaderboard | null;
  showAll: boolean;
}) {
  const copy = REFERRAL_CHALLENGE.board;
  const entries = board?.entries ?? [];
  const shown = showAll
    ? entries.length
    : Math.min(entries.length, LEADERBOARD_PREVIEW);
  const canToggle = entries.length > LEADERBOARD_PREVIEW;

  return (
    <section
      id="leaderboard"
      className="scroll-mt-65 bg-jumpa-surface md:scroll-mt-95"
    >
      <div className="mx-auto flex w-402 flex-col items-center pt-52 pb-34 text-center md:w-1440 md:pt-57 md:pb-60">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <h2 className="mt-8 font-extrabold text-jumpa-ink text-u-34/40 -tracking-u-0.75 md:mt-10 md:text-u-46/54 md:-tracking-u-1">
          {copy.heading}
        </h2>
        <p className="mt-8 w-330 text-jumpa-ink-muted text-u-15/22 -tracking-u-0.25 md:mt-12 md:w-760 md:text-u-18/28 md:-tracking-u-0.25">
          {copy.subhead}
        </p>

        {entries.length === 0 ? (
          <p className="mt-42 w-354 rounded-u-20 bg-jumpa-white px-24 py-32 text-jumpa-ink-muted text-u-15/22 shadow-lift-u-10/30 shadow-jumpa-primary-600/8 md:mt-72 md:w-1200 md:rounded-u-32 md:py-48 md:text-u-18/28 md:shadow-lift-u-12/40">
            {board ? copy.empty : copy.unavailable}
          </p>
        ) : (
          <>
            <LeaderboardPodium entries={entries.slice(0, PODIUM)} />
            {shown > PODIUM && (
              <LeaderboardTable
                rows={entries.slice(PODIUM, shown)}
                footer={{
                  text: copy.showing(shown, board?.totals.referrers ?? shown),
                  link: canToggle
                    ? showAll
                      ? {
                          href: `${REFERRAL_LEADERBOARD_HREF}#leaderboard`,
                          label: copy.viewTop(LEADERBOARD_PREVIEW),
                        }
                      : {
                          href: `${REFERRAL_LEADERBOARD_HREF}?view=all#leaderboard`,
                          label: copy.viewAll,
                        }
                    : null,
                }}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
