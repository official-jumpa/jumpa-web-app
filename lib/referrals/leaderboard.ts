import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/db";
import { environment } from "@/lib/environment";
import { getCampaignWindow, isInCampaign } from "@/lib/referrals/campaign";
import { publicInitials, publicName } from "@/lib/referrals/names";
import { Referral } from "@/models/Referral";
import { ReferralReward } from "@/models/ReferralReward";
import { type IUser, User } from "@/models/User";

export type LeaderboardEntry = {
  rank: number;
  name: string;
  initials: string;
  /** Friends who signed up with their link during the campaign. */
  invited: number;
  /** Friends rewarded: signed up, passed KYC and traded. Ranks the board. */
  referrals: number;
  /** Naira earned from referrals. */
  earned: number;
};

export type ReferralLeaderboard = {
  live: boolean;
  entries: LeaderboardEntry[];
  /** `earned` counts claimed and unclaimed rewards, both sides; `referrers` is everyone with a reward. */
  totals: { referrals: number; earned: number; referrers: number };
};

/** Rows loaded for the full board. */
const LEADERBOARD_SIZE = 100;
/** Rows shown before "View full leaderboard". */
export const LEADERBOARD_PREVIEW = 10;
/** The board is public, so it is computed at most once every 5 minutes. */
const REVALIDATE_SECONDS = 300;

/** The landing section and page show only once this is switched on, so the campaign can run quietly first. */
export function isLeaderboardPublic(): boolean {
  return environment.REFERRAL_LEADERBOARD_PUBLIC;
}

type Facets = {
  top: { _id: string; referrals: number; earned: number }[];
  totals: { referrals: number; earned: number }[];
  referrers: { count: number }[];
};

async function loadLeaderboard(): Promise<ReferralLeaderboard> {
  const window = getCampaignWindow();
  const empty = {
    live: false,
    entries: [],
    totals: { referrals: 0, earned: 0, referrers: 0 },
  };
  if (!window.start) return empty;
  await connectDB();

  const [facets] = await ReferralReward.aggregate<Facets>([
    { $match: { createdAt: { $gte: window.start } } },
    {
      $facet: {
        // Ties go to whoever got there first.
        top: [
          { $match: { role: "referrer" } },
          {
            $group: {
              _id: "$userId",
              referrals: { $sum: 1 },
              earned: { $sum: "$amount" },
              reachedAt: { $max: "$createdAt" },
            },
          },
          { $sort: { referrals: -1, reachedAt: 1 } },
          { $limit: LEADERBOARD_SIZE },
        ],
        totals: [
          {
            $group: {
              _id: null,
              referrals: {
                $sum: { $cond: [{ $eq: ["$role", "referrer"] }, 1, 0] },
              },
              earned: { $sum: "$amount" },
            },
          },
        ],
        referrers: [
          { $match: { role: "referrer" } },
          { $group: { _id: "$userId" } },
          { $count: "count" },
        ],
      },
    },
  ]);

  const top = facets?.top ?? [];
  const ids = top.map((t) => t._id);
  const signedUp = window.end
    ? { $gte: window.start, $lt: window.end }
    : { $gte: window.start };
  const [users, invites] = ids.length
    ? await Promise.all([
        User.find({ _id: { $in: ids } }, "_id name jumpaTag").lean<
          Pick<IUser, "_id" | "name" | "jumpaTag">[]
        >(),
        Referral.aggregate<{ _id: string; invited: number }>([
          { $match: { referrerId: { $in: ids }, createdAt: signedUp } },
          { $group: { _id: "$referrerId", invited: { $sum: 1 } } },
        ]),
      ])
    : [[], []];
  const userById = new Map(users.map((u) => [u._id, u]));
  const invitedById = new Map(invites.map((i) => [i._id, i.invited]));

  return {
    live: isInCampaign(window, new Date()),
    entries: top.map((row, index) => {
      const user = userById.get(row._id);
      return {
        rank: index + 1,
        name: publicName(user),
        initials: publicInitials(user),
        // Every rewarded friend signed up in the window; max() guards a hand-edited row.
        invited: Math.max(invitedById.get(row._id) ?? 0, row.referrals),
        referrals: row.referrals,
        earned: row.earned,
      };
    }),
    totals: {
      referrals: facets?.totals[0]?.referrals ?? 0,
      earned: facets?.totals[0]?.earned ?? 0,
      referrers: facets?.referrers[0]?.count ?? 0,
    },
  };
}

export const getReferralLeaderboard = unstable_cache(
  loadLeaderboard,
  ["referral-leaderboard", "v2"],
  {
    revalidate: REVALIDATE_SECONDS,
    tags: ["referral-leaderboard"],
  },
);
