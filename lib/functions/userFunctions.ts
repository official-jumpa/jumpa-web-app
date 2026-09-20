import { connectDB, getDb } from "@/lib/db";
import { User, type IUser } from "@/models/User";
import { UserActivityLog, type IUserActivityLog } from "@/models/UserActivityLog";
import {
  Beneficiary,
  type IBeneficiary,
  type BeneficiaryType,
} from "@/models/Beneficiary";

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
  data: Partial<Pick<IUser, "name" | "nickname" | "country" | "image" | "jumpaTag">>,
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
 * Updates a user's nickname.
 */
export async function updateUserNickname(
  userId: string,
  nickname: string,
): Promise<IUser | null> {
  await connectDB();
  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { nickname: nickname.trim() } },
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
 * Enhanced user activity logger that optionally accepts a NextRequest or Headers
 * to automatically record IP address and User-Agent.
 */
export async function logUserActivity(params: {
  userId: string;
  action: IUserActivityLog["action"];
  details?: Record<string, any>;
  req?: { headers: Headers | { get(key: string): string | null } };
  ipAddress?: string;
  userAgent?: string;
}): Promise<IUserActivityLog> {
  let ip = params.ipAddress;
  let ua = params.userAgent;

  if (params.req) {
    if (!ip) {
      const forwarded = params.req.headers.get("x-forwarded-for");
      ip = forwarded ? forwarded.split(",")[0].trim() : params.req.headers.get("x-real-ip") || undefined;
    }
    if (!ua) {
      ua = params.req.headers.get("user-agent") || undefined;
    }
  }

  return recordUserActivity({
    userId: params.userId,
    action: params.action,
    details: params.details,
    ipAddress: ip,
    userAgent: ua,
  });
}

/**
 * Soft-deletes a user and revokes their active sessions.
 * User data and analytics (wallets, transactions, activity logs, referrals, etc.) are retained for 30 days before permanent deletion
 */
export async function deleteUserAndAccountData(userId: string): Promise<void> {
  await connectDB();

  // 1. Soft-delete user: update status to "deleted" and record deletion timestamp
  await User.findByIdAndUpdate(userId, {
    $set: {
      status: "deleted",
      deletedAt: new Date(),
    },
  });

  // 2. Invalidate active sessions immediately so user is signed out everywhere
  const db = getDb();
  await db.collection("session").deleteMany({ userId });
}

/**
 * Retrieves the user's saved beneficiaries, optionally filtered by type (bank, wallet, jumpa, momo).
 */
export async function getUserBeneficiaries(
  userId: string,
  type?: BeneficiaryType,
  limit = 20,
): Promise<IBeneficiary[]> {
  await connectDB();
  const query: Record<string, any> = { userId };
  if (type) query.type = type;

  return Beneficiary.find(query)
    .sort({ lastUsedAt: -1 })
    .limit(limit)
    .lean<IBeneficiary[]>();
}

/**
 * Saves or updates a beneficiary for the user upon successful transfer.
 * Upserts by (userId, type, identifier) and bumps lastUsedAt.
 */
export async function saveOrUpdateBeneficiary(
  userId: string,
  data: {
    type: BeneficiaryType;
    name: string;
    identifier: string;
    details?: IBeneficiary["details"];
  },
): Promise<IBeneficiary> {
  await connectDB();

  const filter = {
    userId,
    type: data.type,
    identifier: data.identifier.trim().toLowerCase(),
  };

  const update = {
    $set: {
      name: data.name.trim(),
      details: data.details || {},
      lastUsedAt: new Date(),
    },
    $setOnInsert: {
      userId,
      type: data.type,
      identifier: data.identifier.trim().toLowerCase(),
    },
  };

  const doc = await Beneficiary.findOneAndUpdate(filter, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  return doc;
}

/**
 * Deletes a saved beneficiary belonging to the user.
 */
export async function deleteBeneficiary(
  userId: string,
  beneficiaryId: string,
): Promise<boolean> {
  await connectDB();
  const result = await Beneficiary.deleteOne({ _id: beneficiaryId, userId });
  return (result.deletedCount || 0) > 0;
}

/**
 * Finds a user by their unique Jumpa tag (case-insensitive).
 */
export async function findUserByJumpaTag(
  jumpaTag: string,
): Promise<IUser | null> {
  await connectDB();
  const user = await User.findOne({
    jumpaTag: jumpaTag.toLowerCase().trim(),
  }).lean<IUser>();
  return user ?? null;
}

/**
 * Updates a user's 6-digit login password hash.
 */
export async function setUserLoginPassword(
  userId: string,
  loginPasswordHash: string,
): Promise<IUser | null> {
  await connectDB();
  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { loginPasswordHash } },
    { new: true },
  ).lean<IUser>();
  return updated ?? null;
}

/**
 * Updates a user's unique Jumpa tag.
 */
export async function setUserJumpaTag(
  userId: string,
  jumpaTag: string,
): Promise<IUser | null> {
  await connectDB();
  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { jumpaTag: jumpaTag.toLowerCase().trim() } },
    { new: true },
  ).lean<IUser>();
  return updated ?? null;
}

/**
 * Retrieves all active, unexpired sessions for a user from session collection
 */
export async function getUserActiveSessions(userId: string): Promise<any[]> {
  await connectDB();
  const db = getDb();
  return db
    .collection("session")
    .find({
      userId,
      expiresAt: { $gt: new Date() },
    })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Deletes an active session belonging to a user
 */
export async function deleteUserActiveSession(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  await connectDB();
  const db = getDb();
  const res = await db.collection("session").deleteOne({
    _id: sessionId as any,
    userId,
  });
  return (res.deletedCount || 0) > 0;
}

/**
 * Revokes all active sessions for a user except the currently active one
 */
export async function deleteOtherUserSessions(
  userId: string,
  currentId?: string,
  currentToken?: string,
): Promise<number> {
  await connectDB();
  const db = getDb();
  const filter: Record<string, any> = { userId };
  if (currentId) {
    filter._id = { $ne: currentId };
  } else if (currentToken) {
    filter.token = { $ne: currentToken };
  }
  const result = await db.collection("session").deleteMany(filter);
  return result.deletedCount || 0;
}