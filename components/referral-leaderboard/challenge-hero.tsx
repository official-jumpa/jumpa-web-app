import Image from "next/image";
import Link from "next/link";
import { CopyLinkButton } from "@/components/referral-leaderboard/copy-link-button";
import { RewardCards } from "@/components/referral-leaderboard/reward-cards";
import { LinkIcon } from "@/components/ui/icons/link";
import { REFERRAL_CHALLENGE } from "@/lib/landing";

const PILL =
  "tap inline-flex h-54 w-354 items-center justify-center gap-10 whitespace-nowrap rounded-full font-semibold text-u-16/24 active:scale-[0.98] md:h-56";
const PRIMARY = `${PILL} bg-linear-to-r from-jumpa-primary-450 to-jumpa-primary-600 text-jumpa-white shadow-lift-u-10/12 shadow-jumpa-primary-600/30 md:w-250`;
const SECONDARY = `${PILL} border-u-1.5 border-jumpa-secondary-150 bg-jumpa-white text-jumpa-ink md:w-180`;

const PHOTO = "/images/referrals/hero.webp";
// The photo's box on phones is 95% of the frame, on desktop 69%.
const PHOTO_SIZES = "(min-width: 768px) 69vw, 95vw";

/** The photo banner with its headline. */
function HeroBanner() {
  const { hero } = REFERRAL_CHALLENGE;
  return (
    <div className="relative isolate h-158 w-354 overflow-clip rounded-u-20 bg-jumpa-secondary-150 md:h-256 md:w-1045 md:rounded-u-40">
      <Image
        src={PHOTO}
        alt=""
        width={1024}
        height={572}
        sizes={PHOTO_SIZES}
        priority
        className="absolute -top-28 left-0 h-213.75 w-382.75 max-w-none object-cover md:-top-93.5 md:left-96 md:h-554 md:w-992.5"
      />
      {/* Desktop mirrors the photo into the banner's left edge, under the glow. */}
      <Image
        src={PHOTO}
        alt=""
        width={1024}
        height={572}
        sizes={PHOTO_SIZES}
        className="absolute -top-80 -left-872 hidden h-540.5 w-968.5 max-w-none -scale-x-100 object-cover md:block"
      />
      {/* biome-ignore lint/performance/noImgElement: next/image does not optimise SVGs. */}
      <img
        src="/images/referrals/hero-glow.svg"
        alt=""
        aria-hidden="true"
        className="absolute -top-131.75 -left-124.75 h-411.5 w-514 max-w-none md:hidden"
      />
      <span
        aria-hidden="true"
        className="absolute -top-42.5 -left-23 hidden h-341 w-389 bg-jumpa-primary-600 blur-u-150 md:block"
      />
      <h1 className="absolute top-55.75 left-14 w-229 whitespace-nowrap font-extrabold text-jumpa-white text-u-27.75/30.5 -tracking-u-0.75 md:top-60 md:left-30 md:w-408.5 md:text-u-52.75/58.25 md:-tracking-u-1.5">
        {hero.lines[0]}
        <br />
        {hero.lines[1]}{" "}
        <span className="text-jumpa-alt-400">{hero.highlight}</span>
      </h1>
      <p className="absolute top-121.25 left-14 w-221.75 font-semibold text-jumpa-white text-u-8.75/11.75 md:top-183.5 md:left-35 md:w-402.75 md:text-u-15.75/21.25">
        {hero.subhead}
      </p>
    </div>
  );
}

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
  const { copyLink, howItWorksCta } = REFERRAL_CHALLENGE;
  return (
    <section className="mx-auto flex w-402 flex-col items-center pt-43 md:w-1440 md:pt-77.5">
      <HeroBanner />

      <div className="mt-28 flex flex-col gap-10 md:mt-33.5 md:flex-row md:gap-12">
        {referralLink ? (
          <CopyLinkButton link={referralLink} className={PRIMARY} />
        ) : (
          <Link href={fallbackHref} className={PRIMARY}>
            <LinkIcon className="size-20 shrink-0" />
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
