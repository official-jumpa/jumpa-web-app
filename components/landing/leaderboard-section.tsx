import { LandingButton } from "@/components/landing/landing-button";
import { revealStep } from "@/components/landing/reveal";
import { SectionBadge } from "@/components/landing/section-badge";
import { cn } from "@/lib/cn";
import { LEADERBOARD } from "@/lib/landing";
import {
  getReferralLeaderboard,
  type ReferralLeaderboard,
} from "@/lib/referrals/leaderboard";
import { formatRewardNaira } from "@/lib/referrals/rules";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/** Podium places get the solid disc. */
const PODIUM = 3;

async function loadBoard(): Promise<ReferralLeaderboard | null> {
  try {
    return await getReferralLeaderboard();
  } catch (err) {
    // The landing page must render without it.
    console.warn(
      `[Landing] Leaderboard unavailable: ${formatOneLineError(err)}`,
    );
    return null;
  }
}

/**
 * Public referral leaderboard: top referrers by rewarded friends, names masked.
 * Hidden until the campaign is live or someone has earned.
 */
export async function LeaderboardSection() {
  const board = await loadBoard();
  if (!board || (!board.live && board.entries.length === 0)) return null;
  return <LeaderboardBoard board={board} />;
}

export function LeaderboardBoard({ board }: { board: ReferralLeaderboard }) {
  return (
    <section id="leaderboard" className="scroll-mt-65 md:scroll-mt-95">
      <div className="mx-auto flex w-402 flex-col gap-20 px-20 py-56 md:w-1440 md:flex-row md:items-start md:justify-between md:px-104 md:py-108">
        <div className="flex flex-col items-start gap-20 md:w-547 md:gap-24">
          <SectionBadge className="reveal">{LEADERBOARD.badge}</SectionBadge>
          <h2
            style={revealStep(1)}
            className="reveal font-semibold text-jumpa-ink text-u-32/37.25 -tracking-u-1.75 md:text-u-60/70 md:-tracking-u-3.25"
          >
            {LEADERBOARD.heading}
          </h2>
          <p
            style={revealStep(2)}
            className="reveal font-medium text-jumpa-black text-u-16/24.75 -tracking-u-0.5 md:text-u-20/31"
          >
            {LEADERBOARD.subhead}
          </p>

          <dl style={revealStep(3)} className="reveal flex gap-32 md:gap-48">
            <div className="flex flex-col gap-4">
              <dt className="text-jumpa-ink-muted text-u-13/18 md:text-u-16/24">
                {LEADERBOARD.stats.referrals}
              </dt>
              <dd className="font-semibold text-jumpa-ink text-u-24/30 md:text-u-36/44">
                {board.totals.referrals.toLocaleString("en-NG")}
              </dd>
            </div>
            <div className="flex flex-col gap-4">
              <dt className="text-jumpa-ink-muted text-u-13/18 md:text-u-16/24">
                {LEADERBOARD.stats.earned}
              </dt>
              <dd className="font-semibold text-jumpa-ink text-u-24/30 md:text-u-36/44">
                {formatRewardNaira(board.totals.earned)}
              </dd>
            </div>
          </dl>

          {board.live ? (
            <LandingButton
              href={LEADERBOARD.cta.href}
              style={revealStep(4)}
              className="reveal h-48 px-28 text-u-15/24 -tracking-u-0.25 md:h-54.75 md:px-36 md:text-u-16/24.75 md:-tracking-u-0.5"
            >
              {LEADERBOARD.cta.label}
            </LandingButton>
          ) : null}
        </div>

        <div className="reveal flex flex-col gap-16 rounded-u-24 border-u-1 border-jumpa-lavender-200 bg-jumpa-surface p-20 md:w-598 md:gap-20 md:p-32">
          <h3 className="font-semibold text-jumpa-ink text-u-18/24 md:text-u-22/30">
            {LEADERBOARD.boardTitle}
          </h3>
          {board.entries.length === 0 ? (
            <p className="text-jumpa-ink-muted text-u-14/21.75 md:text-u-16/24.75">
              {LEADERBOARD.empty}
            </p>
          ) : (
            <ol className="flex flex-col divide-y divide-jumpa-lavender-250">
              {board.entries.map((entry) => (
                <li
                  key={entry.rank}
                  className="flex items-center gap-12 py-12 first:pt-0 last:pb-0 md:gap-16 md:py-16"
                >
                  <span
                    className={cn(
                      "flex size-32 shrink-0 items-center justify-center rounded-full font-semibold text-u-14/20 md:size-40 md:text-u-16/24",
                      entry.rank <= PODIUM
                        ? "bg-jumpa-primary-600 text-jumpa-white"
                        : "bg-jumpa-primary-50 text-jumpa-primary-600",
                    )}
                  >
                    {entry.rank}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold text-jumpa-ink text-u-15/22 md:text-u-18/26">
                      {entry.name}
                    </span>
                    <span className="text-jumpa-ink-muted text-u-12/18 md:text-u-14/20">
                      {entry.referrals}{" "}
                      {entry.referrals === 1 ? "friend" : "friends"} rewarded
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-jumpa-primary-600 text-u-15/22 md:text-u-18/26">
                    {formatRewardNaira(entry.earned)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
