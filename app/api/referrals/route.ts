import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Referral } from "@/models/Referral";
import { User } from "@/models/User";
import { environment } from "@/lib/environment";
import { ensureUserJumpaFields } from "@/lib/user-profile";

/**
 * GET /api/referrals
 * Returns referral statistics and history for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await ensureUserJumpaFields(session.user.id);
    const referralCode = user?.referralCode || "";

    const origin =
      req.nextUrl.origin ||
      environment.NEXT_PUBLIC_APP_URL;
    const referralLink = referralCode
      ? `${origin}/signup?ref=${referralCode}`
      : "";

    // Fetch all referrals where this user is the referrer
    const referrals = await Referral.find({ referrerId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    // Calculate points (flat 1 point per referral)
    const points = referrals.reduce((sum, r) => sum + (r.points || 1), 0);
    const invited = referrals.length;

    // Fetch minimal data for referred users (Name and Join Date)
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

    return NextResponse.json({
      points,
      invited,
      target: 40,
      referralCode,
      referralLink,
      history,
    });
  } catch (err: any) {
    console.error("[ReferralsAPI] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
