import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { inter, jakarta } from "@/components/landing/fonts";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { RevealObserver } from "@/components/landing/reveal-observer";
import { ChallengeHero } from "@/components/referral-leaderboard/challenge-hero";
import { ChallengeSteps } from "@/components/referral-leaderboard/challenge-steps";
import { LeaderboardStandings } from "@/components/referral-leaderboard/leaderboard-standings";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import {
  CTA,
  REFERRAL_CHALLENGE,
  REFERRAL_LEADERBOARD_HREF,
} from "@/lib/landing";
import {
  getReferralLeaderboard,
  isLeaderboardPublic,
} from "@/lib/referrals/leaderboard";
import { referralLink } from "@/lib/referrals/overview";
import { pageMetadata } from "@/lib/seo";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

export const metadata: Metadata = pageMetadata({
  title: REFERRAL_CHALLENGE.title,
  description: REFERRAL_CHALLENGE.description,
  path: REFERRAL_LEADERBOARD_HREF,
});

async function loadBoard() {
  try {
    return await getReferralLeaderboard();
  } catch (err) {
    // The page still renders; the board says it is updating.
    console.warn(
      `[ReferralLeaderboard] Unavailable: ${formatOneLineError(err)}`,
    );
    return null;
  }
}

/** Public referral campaign page: rewards, how it works and the leaderboard. Same frames as the landing page. */
export default async function ReferralLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  // Read the switch per request, not at build time.
  await connection();
  if (!isLeaderboardPublic()) notFound();

  const [{ view }, session, board] = await Promise.all([
    searchParams,
    getCachedAuthSession(),
    loadBoard(),
  ]);
  const code = session?.user?.referralCode?.trim().toUpperCase();

  return (
    <main
      className={`${jakarta.variable} ${inter.variable} frame-402/550 md:frame-1440/1440 isolate overflow-clip bg-jumpa-white font-jakarta text-jumpa-ink`}
    >
      <RevealObserver />
      <LandingNav />
      <ChallengeHero
        referralLink={code ? referralLink(code) : null}
        // Signed in without a code yet: the in-app screen creates one.
        fallbackHref={session?.user ? "/referrals" : CTA.join.href}
      />
      <ChallengeSteps />
      <LeaderboardStandings board={board} showAll={view === "all"} />
      <LandingFooter />
    </main>
  );
}
