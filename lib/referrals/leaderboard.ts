import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/db";
import { getCampaignWindow, isInCampaign } from "@/lib/referrals/campaign";
import { publicName } from "@/lib/referrals/names";
import { ReferralReward } from "@/models/ReferralReward";
import { type IUser, User } from "@/models/User";

export type LeaderboardEntry = {
  rank: number;
  name: string;
  referrals: number;
  /** Naira earned from referrals. */
  earned: number;
};

export type ReferralLeaderboard = {
  live: boolean;
  entries: LeaderboardEntry[];
  /** `earned` counts claimed and unclaimed rewards, both sides. */
  totals: { referrals: number; earned: number };
};

const LEADERBOARD_SIZE = 10;
/** The landing page is public, so the board is computed at most once every 5 minutes. */
const REVALIDATE_SECONDS = 300;

type Facets = {
  top: { _id: string; referrals: number; earned: number }[];
  totals: { referrals: number; earned: number }[];
};

async function loadLeaderboard(): Promise<ReferralLeaderboard> {
  const window = getCampaignWindow();
  const empty = {
    live: false,
    entries: [],
    totals: { referrals: 0, earned: 0 },
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
      },
    },
  ]);

  const top = facets?.top ?? [];
  const users = await User.find(
    { _id: { $in: top.map((t) => t._id) } },
    "_id name jumpaTag",
  ).lean<Pick<IUser, "_id" | "name" | "jumpaTag">[]>();
  const userById = new Map(users.map((u) => [u._id, u]));

  return {
    live: isInCampaign(window, new Date()),
    entries: top.map((row, index) => ({
      rank: index + 1,
      name: publicName(userById.get(row._id)),
      referrals: row.referrals,
      earned: row.earned,
    })),
    totals: {
      referrals: facets?.totals[0]?.referrals ?? 0,
      earned: facets?.totals[0]?.earned ?? 0,
    },
  };
}

export const getReferralLeaderboard = unstable_cache(
  loadLeaderboard,
  ["referral-leaderboard"],
  {
    revalidate: REVALIDATE_SECONDS,
    tags: ["referral-leaderboard"],
  },
);
