import { connectDB, getDb } from "@/lib/db";
import { User, type IUser } from "@/models/User";
import { UserActivityLog, type IUserActivityLog } from "@/models/UserActivityLog";
import { Wallet } from "@/models/Wallet";
import { ChatLog } from "@/models/ChatLog";
import { Transaction } from "@/models/Transaction";
import { Referral } from "@/models/Referral";

/**
 * Retrieves a user by their unique user ID.
 */
export async function getUserById(userId: string): Promise<IUser | null> {
  await connectDB();
  const user = await User.findById(userId).lean<IUser>();
  return user ?? null;
}

/**
 * Updates a user's profile information.
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<IUser, "name" | "country" | "image" | "jumpaTag">>,
): Promise<IUser | null> {
  await connectDB();
  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: data },
    { new: true, runValidators: true },
  ).lean<IUser>();
  return updated ?? null;
}

/**
 * Sets the active wallet ID for a user.
 */
export async function setUserActiveWallet(
  userId: string,
  walletId: string,
): Promise<void> {
  await connectDB();
  await User.findByIdAndUpdate(userId, {
    $set: { activeWalletId: walletId },
  });
}

/**
 * Marks that a user has created at least one savings plan.
 */
export async function setUserCreatedSavings(userId: string): Promise<void> {
  await connectDB();
  await User.findByIdAndUpdate(userId, {
    $set: { hasCreatedSavings: true },
  });
}

/**
 * Records that a user has viewed the intro for a specific savings product.
 */
export async function markSavingsIntroSeen(
  userId: string,
  kind: "individual" | "lock" | "circle",
): Promise<void> {
  await connectDB();
  await User.findByIdAndUpdate(userId, {
    $set: { [`seenSavingsIntros.${kind}`]: true },
  });
}

/**
 * Logs a discrete user activity event.
 */
export async function recordUserActivity(params: {
  userId: string;
  action: IUserActivityLog["action"];
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<IUserActivityLog> {
  await connectDB();
  return UserActivityLog.create(params);
}

/**
 * Permanently deletes a user and all their associated data.
 * Wallets are self-custodial: deleting drops Jumpa's copy, not the funds.
 * ‼️ Just don't call this function. It will affect the analytics, better to do a soft delete
 */
export async function deleteUserAndAccountData(userId: string): Promise<void> {
  await connectDB();

  // 1. Delete user data
  await Promise.all([
    Wallet.deleteMany({ userId }),
    ChatLog.deleteMany({ userId }),
    Transaction.deleteMany({ userId }),
    UserActivityLog.deleteMany({ userId }),
    Referral.deleteMany({
      $or: [{ referrerId: userId }, { referredUserId: userId }],
    }),
  ]);

  // 2. Delete auth data
  const db = getDb();
  await Promise.all([
    db.collection("session").deleteMany({ userId }),
    db.collection("account").deleteMany({ userId }),
  ]);

  // 3. Delete user document
  await User.deleteOne({ _id: userId });
}