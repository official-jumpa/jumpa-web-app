import { LandingButton } from "@/components/landing/landing-button";
import { revealStep } from "@/components/landing/reveal";
import { SectionBadge } from "@/components/landing/section-badge";
import { StepCards } from "@/components/referral-leaderboard/challenge-steps";
import { REFERRAL_TEASER } from "@/lib/landing";
import { isLeaderboardPublic } from "@/lib/referrals/leaderboard";

/** The landing's short referral pitch; the full board is one click away. Hidden until the leaderboard goes public. */
export function ReferralSection() {
  if (!isLeaderboardPublic()) return null;
  return (
    <section id="referral" className="scroll-mt-65 md:scroll-mt-95">
      <div className="mx-auto flex w-402 flex-col items-center py-56 text-center md:w-1440 md:py-108">
        <SectionBadge className="reveal">{REFERRAL_TEASER.badge}</SectionBadge>
        <h2
          style={revealStep(1)}
          className="reveal mt-20 w-362 font-semibold text-jumpa-ink text-u-32/37.25 -tracking-u-1.75 md:mt-24 md:w-900 md:text-u-60/70 md:-tracking-u-3.25"
        >
          {REFERRAL_TEASER.heading}
        </h2>
        <p
          style={revealStep(2)}
          className="reveal mt-16 w-362 font-medium text-jumpa-black text-u-16/24.75 -tracking-u-0.5 md:mt-20 md:w-760 md:text-u-20/31"
        >
          {REFERRAL_TEASER.subhead}
        </p>
        <div style={revealStep(3)} className="reveal mt-32 md:mt-56">
          <StepCards />
        </div>
        <LandingButton
          href={REFERRAL_TEASER.cta.href}
          style={revealStep(4)}
          className="reveal mt-32 h-48 px-28 text-u-15/24 -tracking-u-0.25 md:mt-48 md:h-54.75 md:px-36 md:text-u-16/24.75 md:-tracking-u-0.5"
        >
          {REFERRAL_TEASER.cta.label}
        </LandingButton>
      </div>
    </section>
  );
}
