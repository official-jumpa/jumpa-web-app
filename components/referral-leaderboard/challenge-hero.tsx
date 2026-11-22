import Link from "next/link";
import { CopyLinkButton } from "@/components/referral-leaderboard/copy-link-button";
import { RewardCards } from "@/components/referral-leaderboard/reward-cards";
import { ChainIcon } from "@/components/ui/icons/chain";
import { REFERRAL_CHALLENGE } from "@/lib/landing";

const PILL =
  "tap inline-flex h-46 items-center justify-center gap-8 whitespace-nowrap rounded-full px-18 font-semibold text-u-13/20 active:scale-[0.98] md:h-54 md:gap-10 md:px-26 md:text-u-16/24";
const PRIMARY = `${PILL} bg-jumpa-primary-600 text-jumpa-white`;
const SECONDARY = `${PILL} border-u-1 border-jumpa-lavender-200 bg-jumpa-white text-jumpa-ink`;

/**
 * Banner, the two calls to action, and the reward cards.
 * `referralLink` is null for a signed-out visitor, who is sent to `fallbackHref` instead.
 */
export function ChallengeHero({
  referralLink,
  fallbackHref,
}: {
  referralLink: string | null;
  fallbackHref: string;
}) {
  const { hero, copyLink, howItWorksCta } = REFERRAL_CHALLENGE;
  return (
    <section className="mx-auto flex w-402 flex-col items-center pt-24 md:w-1440 md:pt-77">
      {/* TODO: the design's group photo sits on the right of this banner; export it from Figma into public/images/referrals/. */}
      <div className="flex h-170 w-362 items-center rounded-u-18 bg-linear-to-r from-jumpa-primary-700 via-jumpa-primary-500 to-jumpa-primary-300 px-24 md:h-256 md:w-1045 md:rounded-u-20 md:px-38">
        <h1 className="font-bold text-jumpa-white text-u-32/36 -tracking-u-1 md:text-u-54/60 md:-tracking-u-2">
          {hero.lines[0]}
          <br />
          {hero.lines[1]}{" "}
          <span className="text-jumpa-alt-400">{hero.highlight}</span>
        </h1>
      </div>

      <div className="mt-20 flex gap-10 md:mt-35 md:gap-14">
        {referralLink ? (
          <CopyLinkButton link={referralLink} className={PRIMARY} />
        ) : (
          <Link href={fallbackHref} className={PRIMARY}>
            <ChainIcon className="size-16 shrink-0 md:size-18" />
            {copyLink.signedOut}
          </Link>
        )}
        <a href="#how-it-works" className={SECONDARY}>
          {howItWorksCta}
        </a>
      </div>

      <RewardCards />
    </section>
  );
}
