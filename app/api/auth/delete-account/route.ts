import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB, getDb } from "@/lib/db";
import { clearSession } from "@/lib/session";
import { ChatLog } from "@/models/ChatLog";
import { Referral } from "@/models/Referral";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";
import { UserActivityLog } from "@/models/UserActivityLog";
import { Wallet } from "@/models/Wallet";

/**
 * POST /api/auth/delete-account — removes the signed-in user and everything
 * keyed to them, then ends the session.
 *
 * Wallets are self-custodial: deleting the record drops Jumpa's copy of the
 * address, not the funds. Recovering them needs the user's recovery phrase.
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    await connectDB();

    await Promise.all([
      Wallet.deleteMany({ userId }),
      ChatLog.deleteMany({ userId }),
      Transaction.deleteMany({ userId }),
      UserActivityLog.deleteMany({ userId }),
      Referral.deleteMany({
        $or: [{ referrerId: userId }, { referredUserId: userId }],
      }),
    ]);

    // BetterAuth owns these two collections directly — no mongoose model — and
    // an orphaned `account` row keeps the email from being reusable.
    const db = getDb();
    await Promise.all([
      db.collection("session").deleteMany({ userId }),
      db.collection("account").deleteMany({ userId }),
    ]);

    await User.deleteOne({ _id: userId });
  } catch (err) {
    console.error("[DeleteAccount] Failed to delete user data:", err);
    return NextResponse.json(
      { error: "Could not delete the account. Please try again." },
      { status: 500 },
    );
  }

  // The user row is already gone, so a failure here only leaves a dead session.
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (err) {
    console.warn("[DeleteAccount] signOut error:", err);
  }

  await clearSession();

  return NextResponse.json({ message: "Account deleted" });
}
