import { connectDB, getDb } from "@/lib/db";
import { User, type IUser } from "@/models/User";
import { UserActivityLog, type IUserActivityLog } from "@/models/UserActivityLog";
import {
  Beneficiary,
  type IBeneficiary,
  type BeneficiaryType,
} from "@/models/Beneficiary";
import { UserPreference, type IUserPreference } from "@/models/UserPreference";
import { generateId } from "@/lib/schema-ids";
import type { UpdatePreferencesInput } from "@/lib/validations/user.validation";
import type { NotificationType } from "@/models/Notification";
import { normalizeEmail } from "@/lib/utils/email-policy";

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
    { returnDocument: "after", runValidators: true },
  ).lean<IUser>();
  if (updated) {
    logUserActivity({
      userId,
      action: "PROFILE_UPDATED",
      details: { updatedFields: Object.keys(data) },
    }).catch(() => {});
  }
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
    { returnDocument: "after", runValidators: true },
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
 * Logs a discrete user activity event safely without throwing on error.
 */
export async function recordUserActivity(params: {
  userId: string;
  action: IUserActivityLog["action"];
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<IUserActivityLog | null> {
  try {
    await connectDB();
    return await UserActivityLog.create(params);
  } catch (error) {
    console.warn(`[ActivityLog] Failed to record user activity (${params.action}) for ${params.userId}:`, error);
    return null;
  }
}

/**
 * Enhanced user activity logger that optionally accepts a NextRequest or Headers,
 * or automatically falls back to next/headers to record IP address and User-Agent.
 */
export async function logUserActivity(params: {
  userId: string;
  action: IUserActivityLog["action"];
  details?: Record<string, any>;
  req?: { headers: Headers | { get(key: string): string | null } };
  ipAddress?: string;
  userAgent?: string;
}): Promise<IUserActivityLog | null> {
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

  // If IP or UA is still missing, attempt to extract from current Next.js request context via next/headers
  if (!ip || !ua) {
    try {
      const { headers } = await import("next/headers");
      const h = await headers();
      if (!ip) {
        const forwarded = h.get("x-forwarded-for");
        ip = forwarded ? forwarded.split(",")[0].trim() : h.get("x-real-ip") || undefined;
      }
      if (!ua) {
        ua = h.get("user-agent") || undefined;
      }
    } catch {
      // Ignored if called outside request context (e.g. background job, worker)
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
 * Retrieves the user's saved beneficiaries or recents, optionally filtered by type.
 */
export async function getUserBeneficiaries(
  userId: string,
  type?: BeneficiaryType,
  savedOnly = true,
  limit = 10,
): Promise<IBeneficiary[]> {
  await connectDB();
  const query: Record<string, any> = { userId };
  if (type) query.type = type;
  if (savedOnly !== undefined) query.isSaved = savedOnly;

  const sortOrder: Record<string, any> = savedOnly
    ? { isFavorite: -1, lastUsedAt: -1 }
    : { lastUsedAt: -1 };

  return Beneficiary.find(query)
    .sort(sortOrder)
    .limit(limit)
    .lean<IBeneficiary[]>();
}

/**
 * Returns both saved beneficiaries and recent transfer history in parallel.
 */
export async function getBeneficiariesAndRecents(
  userId: string,
  type?: BeneficiaryType,
  limit = 10,
): Promise<{ beneficiaries: IBeneficiary[]; recents: IBeneficiary[] }> {
  await connectDB();
  const [beneficiaries, recents] = await Promise.all([
    getUserBeneficiaries(userId, type, true, limit),
    getUserBeneficiaries(userId, type, false, limit),
  ]);
  return { beneficiaries, recents };
}

/**
 * Normalizes a beneficiary identifier appropriately per destination type and blockchain.
 * - Stellar: 56-character Base32 starting with G. Case-sensitive uppercase.
 * - Solana: 32-44 character Base58. Case-sensitive (case MUST be preserved).
 * - Tron: 34-character Base58 starting with T. Case-sensitive (case MUST be preserved).
 * - EVM: 42-character hex starting with 0x. Case-insensitive (lowercase standard).
 * - Bank: Digits or "bankCode:accountNumber".
 */
export function normalizeBeneficiaryIdentifier(
  type: BeneficiaryType,
  identifier: string,
): string {
  const trimmed = (identifier || "").trim();
  if (!trimmed) return "";

  if (type === "bank") {
    return trimmed;
  }

  if (type === "wallet") {
    let addr = trimmed;
    if (addr.includes(":")) {
      addr = addr.split(":")[1] || addr;
    }

    if (
      (addr.startsWith("G") || addr.startsWith("g")) &&
      addr.length === 56
    ) {
      return addr.toUpperCase();
    }

    if (addr.startsWith("0x") || addr.startsWith("0X")) {
      return addr.toLowerCase();
    }

    return addr;
  }

  return trimmed.toLowerCase();
}

/**
 * Checks if a destination (wallet address or bank account) is already an explicitly saved beneficiary.
 */
export async function isExistingSavedBeneficiary(
  userId: string,
  type: BeneficiaryType,
  identifier: string,
): Promise<boolean> {
  await connectDB();
  const cleanId = normalizeBeneficiaryIdentifier(type, identifier);
  if (!cleanId) return false;

  const escaped = cleanId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (type === "wallet") {
    const exists = await Beneficiary.exists({
      userId,
      type: "wallet",
      isSaved: true,
      $or: [
        { identifier: cleanId },
        { identifier: new RegExp(`^${escaped}$`, "i") },
        { identifier: new RegExp(`:${escaped}$`, "i") },
        { "details.walletAddress": new RegExp(`^${escaped}$`, "i") },
      ],
    });
    return Boolean(exists);
  }

  if (type === "bank") {
    const acct = cleanId.includes(":") ? cleanId.split(":")[1] : cleanId;
    const exists = await Beneficiary.exists({
      userId,
      type: "bank",
      isSaved: true,
      $or: [
        { identifier: cleanId },
        { identifier: new RegExp(`${acct}$`, "i") },
        { "details.accountNumber": acct },
      ],
    });
    return Boolean(exists);
  }

  const exists = await Beneficiary.exists({
    userId,
    type,
    identifier: new RegExp(`^${escaped}$`, "i"),
    isSaved: true,
  });
  return Boolean(exists);
}

/**
 * Automatically records a transfer destination as a "Recent" (isSaved: false).
 * If it is already a saved beneficiary (isSaved: true), preserves custom name and star.
 */
export async function trackRecent(
  userId: string,
  data: {
    type: BeneficiaryType;
    name: string;
    identifier: string;
    details?: IBeneficiary["details"];
  },
): Promise<IBeneficiary> {
  await connectDB();

  const cleanIdentifier = normalizeBeneficiaryIdentifier(data.type, data.identifier);
  const escaped = cleanIdentifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const orConditions: any[] = [
    { identifier: cleanIdentifier },
    { identifier: new RegExp(`^${escaped}$`, "i") },
    { identifier: new RegExp(`:${escaped}$`, "i") },
  ];
  if (data.type === "wallet") {
    orConditions.push({ "details.walletAddress": new RegExp(`^${escaped}$`, "i") });
  } else if (data.type === "bank") {
    const acct = cleanIdentifier.includes(":") ? cleanIdentifier.split(":")[1] : cleanIdentifier;
    orConditions.push({ "details.accountNumber": acct });
  }

  // Prioritize existing saved beneficiary first so custom name is preserved
  const existing = await Beneficiary.findOne({
    userId,
    type: data.type,
    $or: orConditions,
  }).sort({ isSaved: -1, lastUsedAt: -1 });

  if (existing) {
    existing.lastUsedAt = new Date();
    existing.identifier = cleanIdentifier;
    if (!existing.isSaved) {
      existing.name = data.name.trim();
    }
    if (data.details) {
      existing.details = { ...existing.details, ...data.details };
      if (data.type === "wallet") {
        existing.details.walletAddress = cleanIdentifier;
      }
    }
    await existing.save();

    // Clean up any stale unmanaged recents with the same identifier if this is a saved beneficiary
    if (existing.isSaved) {
      await Beneficiary.deleteMany({
        _id: { $ne: existing._id },
        userId,
        type: data.type,
        isSaved: false,
        $or: orConditions,
      }).catch(() => {});
    }

    return existing;
  }

  const newRecent = await Beneficiary.create({
    userId,
    type: data.type,
    identifier: cleanIdentifier,
    name: data.name.trim(),
    details: {
      ...(data.details || {}),
      ...(data.type === "wallet" ? { walletAddress: cleanIdentifier } : {}),
    },
    isSaved: false,
    isFavorite: false,
    lastUsedAt: new Date(),
  });

  return newRecent;
}

/**
 * Explicitly saves or upgrades an account or wallet to a proper Beneficiary (isSaved: true).
 */
export async function saveBeneficiary(
  userId: string,
  data: {
    type: BeneficiaryType;
    name: string;
    identifier: string;
    details?: IBeneficiary["details"];
    isFavorite?: boolean;
  },
): Promise<IBeneficiary> {
  await connectDB();

  const cleanIdentifier = normalizeBeneficiaryIdentifier(data.type, data.identifier);
  const escaped = cleanIdentifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const orConditions: any[] = [
    { identifier: cleanIdentifier },
    { identifier: new RegExp(`^${escaped}$`, "i") },
    { identifier: new RegExp(`:${escaped}$`, "i") },
  ];
  if (data.type === "wallet") {
    orConditions.push({ "details.walletAddress": new RegExp(`^${escaped}$`, "i") });
  } else if (data.type === "bank") {
    const acct = cleanIdentifier.includes(":") ? cleanIdentifier.split(":")[1] : cleanIdentifier;
    orConditions.push({ "details.accountNumber": acct });
  }

  const filter = {
    userId,
    type: data.type,
    $or: orConditions,
  };

  let cleanDetails = data.details ? { ...data.details } : undefined;
  if (data.type === "wallet") {
    cleanDetails = {
      ...(cleanDetails || {}),
      walletAddress: cleanIdentifier,
    };
  }

  const existing = await Beneficiary.findOne(filter).sort({ isSaved: -1, lastUsedAt: -1 });

  let doc: IBeneficiary;
  if (existing) {
    existing.name = data.name.trim();
    existing.identifier = cleanIdentifier;
    existing.isSaved = true;
    existing.lastUsedAt = new Date();
    if (cleanDetails) {
      existing.details = { ...existing.details, ...cleanDetails };
    }
    if (data.isFavorite !== undefined) {
      existing.isFavorite = data.isFavorite;
    }
    doc = await existing.save();

    // Clean up any other duplicate recent records
    await Beneficiary.deleteMany({
      _id: { $ne: existing._id },
      userId,
      type: data.type,
      $or: orConditions,
    }).catch(() => {});
  } else {
    doc = await Beneficiary.create({
      userId,
      type: data.type,
      identifier: cleanIdentifier,
      name: data.name.trim(),
      details: cleanDetails || {},
      isSaved: true,
      isFavorite: data.isFavorite ?? false,
      lastUsedAt: new Date(),
    });
  }

  logUserActivity({
    userId,
    action: "BENEFICIARY_ADDED",
    details: {
      type: data.type,
      name: data.name,
      identifier: cleanIdentifier,
      isFavorite: Boolean(data.isFavorite),
    },
  }).catch(() => {});

  return doc;
}

/**
 * Backward compatibility alias for trackRecent
 */
export const saveOrUpdateBeneficiary = trackRecent;

/**
 * Updates a saved beneficiary's name or favorite status.
 */
export async function updateBeneficiary(
  userId: string,
  beneficiaryId: string,
  updates: {
    name?: string;
    isFavorite?: boolean;
  },
): Promise<IBeneficiary | null> {
  await connectDB();

  const $set: Record<string, any> = {};
  if (updates.name !== undefined) $set.name = updates.name.trim();
  if (updates.isFavorite !== undefined) $set.isFavorite = updates.isFavorite;

  const doc = await Beneficiary.findOneAndUpdate(
    { _id: beneficiaryId, userId, isSaved: true },
    { $set },
    { new: true },
  );

  if (doc) {
    logUserActivity({
      userId,
      action: "BENEFICIARY_UPDATED",
      details: { beneficiaryId, ...updates },
    }).catch(() => {});
  }

  return doc;
}

/**
 * Deletes a saved beneficiary by downgrading it to Recent (Option A).
 * Removes custom friendly name and isFavorite, keeping past transfer history in recents.
 */
export async function deleteBeneficiary(
  userId: string,
  beneficiaryId: string,
  options?: { hard?: boolean },
): Promise<boolean> {
  await connectDB();

  if (options?.hard) {
    const result = await Beneficiary.deleteOne({ _id: beneficiaryId, userId });
    return (result.deletedCount || 0) > 0;
  }

  // Downgrade to recent: clear isSaved and isFavorite
  const result = await Beneficiary.updateOne(
    { _id: beneficiaryId, userId, isSaved: true },
    { $set: { isSaved: false, isFavorite: false } },
  );

  const downgraded = (result.modifiedCount || 0) > 0;
  if (downgraded) {
    logUserActivity({
      userId,
      action: "BENEFICIARY_DELETED",
      details: { beneficiaryId, downgradedToRecent: true },
    }).catch(() => {});
  }
  return downgraded;
}

/**
 * Resolves a contact name or identifier to a saved beneficiary for AI chat routing.
 */
export async function findSavedBeneficiaryByName(
  userId: string,
  nameOrIdentifier: string,
  type?: BeneficiaryType,
): Promise<IBeneficiary | null> {
  await connectDB();
  const trimmed = nameOrIdentifier.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query: Record<string, any> = {
    userId,
    isSaved: true,
    $or: [
      { name: new RegExp(`^${escaped}$`, "i") },
      { name: new RegExp(escaped, "i") },
      { identifier: new RegExp(`^${escaped}$`, "i") },
    ],
  };
  if (type) query.type = type;

  const doc = await Beneficiary.findOne(query).sort({ isFavorite: -1, lastUsedAt: -1 });

  if (doc && doc.type === "wallet") {
    // Auto-repair Stellar public key casing if stored lowercase
    const rawAddr =
      doc.details?.walletAddress ||
      (doc.identifier.includes(":") ? doc.identifier.split(":")[1] : doc.identifier);

    if (rawAddr && (rawAddr.startsWith("g") || rawAddr.startsWith("G")) && rawAddr.length === 56) {
      const upperAddr = rawAddr.toUpperCase();
      let changed = false;

      if (doc.identifier.includes(":")) {
        const chain = doc.identifier.split(":")[0];
        if (doc.identifier !== `${chain}:${upperAddr}`) {
          doc.identifier = `${chain}:${upperAddr}`;
          changed = true;
        }
      } else if (doc.identifier !== upperAddr) {
        doc.identifier = upperAddr;
        changed = true;
      }

      if (!doc.details) {
        doc.details = { walletAddress: upperAddr, chain: "stellar" };
        changed = true;
      } else if (doc.details.walletAddress !== upperAddr) {
        doc.details.walletAddress = upperAddr;
        changed = true;
      }

      if (changed) {
        doc.save().catch(() => {});
      }
    }
  }

  return doc;
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
    {
      $set: {
        loginPasswordHash,
        passwordResetAt: new Date(),
      },
    },
    { returnDocument: "after" },
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
    { returnDocument: "after" },
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

export const DEFAULT_USER_PREFERENCES: Omit<
  IUserPreference,
  "_id" | "userId" | "createdAt" | "updatedAt"
> = {
  pushNotifications: true,
  emailNotifications: true,
  transactionEmails: true,
  newLoginDetected: true,
  haptics: true,
  inAppSounds: true,
};

/**
 * Retrieves the preferences for a specific user.
 * If the user has no preferences record yet, a default one is created and returned.
 */
export async function getUserPreferences(
  userId: string,
): Promise<IUserPreference> {
  await connectDB();
  const existing = await UserPreference.findOne({ userId }).lean<IUserPreference>();
  if (existing) {
    return existing;
  }

  // Create default record for new / existing user
  const newPref = await UserPreference.create({
    _id: generateId("pref"),
    userId,
    ...DEFAULT_USER_PREFERENCES,
  });

  // Link preferenceId back to User document if not already linked
  User.updateOne(
    { _id: userId, preferenceId: null },
    { $set: { preferenceId: newPref._id } },
  ).catch((err) => console.warn("[UserPreference] Failed to link preferenceId on user:", err));

  return newPref.toObject ? newPref.toObject() : newPref;
}

/**
 * Updates a user's preferences with partial fields.
 */
export async function updateUserPreferences(
  userId: string,
  updates: UpdatePreferencesInput,
): Promise<IUserPreference> {
  await connectDB();

  const prefId = generateId("pref");
  const onInsertFields: Record<string, any> = {
    _id: prefId,
    userId,
  };
  for (const [key, value] of Object.entries(DEFAULT_USER_PREFERENCES)) {
    if (!(key in updates)) {
      onInsertFields[key] = value;
    }
  }

  const updated = await UserPreference.findOneAndUpdate(
    { userId },
    {
      $set: updates,
      $setOnInsert: onInsertFields,
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    },
  ).lean<IUserPreference>();

  // Ensure preferenceId on User
  if (updated) {
    User.updateOne(
      { _id: userId, preferenceId: null },
      { $set: { preferenceId: updated._id } },
    ).catch(() => {});
  }

  return updated;
}

/**
 * Checks whether an in-app or push notification should be dispatched based on user preferences.
 */
export async function shouldSendNotification(
  userId: string,
  type: NotificationType,
): Promise<boolean> {
  try {
    const prefs = await getUserPreferences(userId);

    if (type === "LOGIN" && prefs.newLoginDetected === false) {
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[shouldSendNotification] Preference check failed, allowing by default:", err);
    return true;
  }
}

/**
 * Retrieves a user by their email address.
 */
export async function getUserByEmail(email: string): Promise<IUser | null> {
  await connectDB();
  const normalized = normalizeEmail(email);
  const user = await User.findOne({ email: normalized }).lean<IUser>();
  return user ?? null;
}

/**
 * Revokes all active sessions for a user (used during password reset)
 */
export async function deleteAllUserSessions(userId: string): Promise<number> {
  await connectDB();
  const db = getDb();
  const result = await db.collection("session").deleteMany({ userId });
  return result.deletedCount || 0;
}

/**
 * Atomically verifies and consumes the email verification OTP from Better-Auth's verification table.
 * Deletes the record on success to prevent any replay attack.
 */
export async function verifyAndConsumeEmailOtp(
  email: string,
  otp: string,
): Promise<{ ok: boolean; error?: string }> {
  await connectDB();
  const db = getDb();
  const normalized = normalizeEmail(email);
  const identifier = `email-verification-otp-${normalized}`;

  const verificationRecord = await db.collection("verification").findOne({
    identifier,
  });

  if (!verificationRecord) {
    return { ok: false, error: "Invalid or expired verification code." };
  }

  if (new Date(verificationRecord.expiresAt) < new Date()) {
    await db.collection("verification").deleteOne({ identifier });
    return {
      ok: false,
      error: "Verification code has expired. Please request a new one.",
    };
  }

  // Format in better-auth email-otp: `${storedOtp}:${attempts}`
  const rawValue = String(verificationRecord.value || "");
  const lastColonIndex = rawValue.lastIndexOf(":");
  const storedOtp =
    lastColonIndex === -1 ? rawValue : rawValue.slice(0, lastColonIndex);
  const attemptsStr =
    lastColonIndex === -1 ? "0" : rawValue.slice(lastColonIndex + 1);
  const attempts = parseInt(attemptsStr, 10) || 0;

  if (attempts >= 3) {
    await db.collection("verification").deleteOne({ identifier });
    return {
      ok: false,
      error: "Too many failed attempts. Please request a new code.",
    };
  }

  if (storedOtp !== otp.trim()) {
    await db.collection("verification").updateOne(
      { identifier },
      { $set: { value: `${storedOtp}:${attempts + 1}` } },
    );
    return {
      ok: false,
      error: "That code isn't right. Check the 6 digits and try again.",
    };
  }

  // Atomically delete the token so it cannot be used again
  await db.collection("verification").deleteOne({ identifier });
  return { ok: true };
}