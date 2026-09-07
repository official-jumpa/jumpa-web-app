import { connectDB } from "@/lib/db";
import { Referral, type IReferral } from "@/models/Referral";
import { User } from "@/models/User";
import { ensureUserJumpaFields } from "@/lib/user-profile";
import { environment } from "@/lib/environment";

/**
 * Returns referral statistics and history for an authenticated user.
 */
export async function getReferralStatsForUser(userId: string) {
  await connectDB();

  const user = await ensureUserJumpaFields(userId);
  const referralCode = user?.referralCode || "";

  const origin = environment.BETTER_AUTH_URL;
  const referralLink = `${origin}/signup?ref=${referralCode}`;

  // Fetch all referrals where this user is the referrer
  const referrals = await Referral.find({ referrerId: userId })
    .sort({ createdAt: -1 })
    .lean<IReferral[]>();

  const points = referrals.reduce((sum, r) => sum + (r.points || 1), 0);
  const invited = referrals.length;

  const referredUserIds = referrals.map((r) => r.referredUserId);
  const referredUsers = await User.find(
    { _id: { $in: referredUserIds } },
    "_id name jumpaTag email",
  ).lean();

  const userMap = new Map<string, { name: string; tag: string }>();
  for (const u of referredUsers) {
    userMap.set(u._id, {
      name: u.name || u.jumpaTag || "Member",
      tag: u.jumpaTag || "",
    });
  }

  const history = referrals.map((r) => {
    const u = userMap.get(r.referredUserId);
    return {
      id: r._id,
      name: u?.name || "Jumpa Member",
      joinedAt: r.createdAt,
      points: r.points || 1,
    };
  });

  return {
    points,
    invited,
    target: 40,
    referralCode,
    referralLink,
    history,
  };
}
