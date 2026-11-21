import { connectDB } from "@/lib/db";
import { environment } from "@/lib/environment";
import {
  type CampaignStatus,
  campaignStatus,
  getCampaignWindow,
  isInCampaign,
} from "@/lib/referrals/campaign";
import {
  getReferralEarnings,
  hasClaimableNairaAccount,
  type ReferralEarnings,
} from "@/lib/referrals/earnings";
import { REFERRAL_REWARD_NGN } from "@/lib/referrals/rules";
import { ensureUserJumpaFields } from "@/lib/user-profile";
import { type IReferral, Referral } from "@/models/Referral";
import { ReferralReward } from "@/models/ReferralReward";
import { type IUser, User } from "@/models/User";

/** What the /referrals screen shows. Dates are ISO strings so it crosses to the client as-is. */

/** `not_eligible`: joined outside the campaign, so it can't earn. */
export type ReferralProgress = IReferral["status"] | "not_eligible";

export type ReferralHistoryItem = {
  id: string;
  name: string;
  joinedAt: string;
  status: ReferralProgress;
  /** What the referrer earned, once rewarded. */
  reward: number | null;
};

export type ReferralOverview = {
  code: string;
  link: string;
  campaign: { status: CampaignStatus; endsAt: string | null };
  earnings: ReferralEarnings;
  hasNairaAccount: boolean;
  counts: { invited: number; rewarded: number };
  history: ReferralHistoryItem[];
  /** The viewer's own welcome reward, when they joined through someone's link. */
  invitedBy: { status: ReferralProgress; reward: number } | null;
};

const HISTORY_LIMIT = 50;

/** Where a referral link points; the sign-up page reads `ref`. */
export function referralLink(code: string): string {
  const origin =
    environment.BETTER_AUTH_URL ||
    environment.AUTH_URL ||
    "https://usejumpa.com";
  return `${origin.replace(/\/$/, "")}/sign-up?ref=${encodeURIComponent(code)}`;
}

export async function getReferralOverview(
  userId: string,
): Promise<ReferralOverview> {
  await connectDB();
  const window = getCampaignWindow();
  const now = new Date();
  const progressOf = (referral: IReferral): ReferralProgress =>
    referral.status !== "rewarded" &&
    window.start &&
    !isInCampaign(window, referral.createdAt)
      ? "not_eligible"
      : referral.status;

  const [
    user,
    earnings,
    hasNairaAccount,
    invited,
    rewarded,
    referrals,
    ownReferral,
  ] = await Promise.all([
    ensureUserJumpaFields(userId),
    getReferralEarnings(userId),
    hasClaimableNairaAccount(userId),
    Referral.countDocuments({ referrerId: userId }),
    Referral.countDocuments({ referrerId: userId, status: "rewarded" }),
    Referral.find({ referrerId: userId })
      .sort({ createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .lean<IReferral[]>(),
    Referral.findOne({ referredUserId: userId }).lean<IReferral>(),
  ]);

  const rewardedIds = referrals
    .filter((r) => r.status === "rewarded")
    .map((r) => r._id);
  const [friends, rewards, ownReward] = await Promise.all([
    User.find(
      { _id: { $in: referrals.map((r) => r.referredUserId) } },
      "_id name jumpaTag",
    ).lean<Pick<IUser, "_id" | "name" | "jumpaTag">[]>(),
    rewardedIds.length > 0
      ? ReferralReward.find(
          { referralId: { $in: rewardedIds }, role: "referrer" },
          "referralId amount",
        ).lean<{ referralId: string; amount: number }[]>()
      : [],
    ownReferral?.status === "rewarded"
      ? ReferralReward.findOne(
          { referralId: ownReferral._id, role: "referred" },
          "amount",
        ).lean<{ amount: number }>()
      : null,
  ]);

  const friendById = new Map(friends.map((f) => [f._id, f]));
  const rewardByReferral = new Map(
    rewards.map((r) => [r.referralId, r.amount]),
  );
  const code = (user?.referralCode ?? "").toUpperCase();

  return {
    code,
    link: referralLink(code),
    campaign: {
      status: campaignStatus(window, now),
      endsAt: window.end?.toISOString() ?? null,
    },
    earnings,
    hasNairaAccount,
    counts: { invited, rewarded },
    history: referrals.map((r) => {
      const friend = friendById.get(r.referredUserId);
      return {
        id: r._id,
        name:
          friend?.name?.trim() ||
          (friend?.jumpaTag ? `@${friend.jumpaTag}` : "Jumpa user"),
        joinedAt: new Date(r.createdAt).toISOString(),
        status: progressOf(r),
        reward: rewardByReferral.get(r._id) ?? null,
      };
    }),
    invitedBy: ownReferral
      ? {
          status: progressOf(ownReferral),
          reward: ownReward?.amount ?? REFERRAL_REWARD_NGN.referred,
        }
      : null,
  };
}
