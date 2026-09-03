import { connectDB } from "@/lib/db";
import { generateReferralCode } from "@/lib/schema-ids";
import { detectUserCountry } from "@/lib/location";
import { User, type IUser } from "@/models/User";

/**
 * Sanitizes name/email to create a base handle for the @jumpa tag.
 * E.g., "Barry Allen" -> "barry"
 *       "ademola.brainpoint@gmail.com" -> "ademola"
 */
export function sanitizeHandle(
  name?: string | null,
  email?: string | null,
): string {
  let raw = "";

  if (name && name.trim()) {
    // Take first name or joined letters
    raw = name.trim().split(" ")[0].toLowerCase();
  } else if (email && email.trim()) {
    raw = email.split("@")[0].toLowerCase();
  }

  // Remove non-alphanumeric chars
  const sanitized = raw.replace(/[^a-z0-9_]/g, "").slice(0, 15);
  return sanitized.length >= 2 ? sanitized : "user";
}

/**
 * Generates a unique jumpaTag for a user, handling collisions gracefully.
 */
export async function generateUniqueJumpaTag(
  name?: string | null,
  email?: string | null,
): Promise<string> {
  await connectDB();
  const base = sanitizeHandle(name, email);
  let candidate = `${base}@jumpa`;

  const existing = await User.findOne({ jumpaTag: candidate });
  if (!existing) {
    return candidate;
  }

  // Collision resolution: append 2-3 random digits
  for (let i = 0; i < 10; i++) {
    const suffix = Math.floor(10 + Math.random() * 90);
    candidate = `${base}${suffix}@jumpa`;
    const taken = await User.findOne({ jumpaTag: candidate });
    if (!taken) {
      return candidate;
    }
  }

  // Fallback with timestamp suffix
  return `${base}${Date.now().toString().slice(-4)}@jumpa`;
}

/**
 * Generates a unique referral code.
 */
export async function generateUniqueReferralCode(): Promise<string> {
  await connectDB();
  for (let i = 0; i < 10; i++) {
    const code = generateReferralCode();
    const existing = await User.findOne({ referralCode: code });
    if (!existing) {
      return code;
    }
  }
  return generateReferralCode();
}

/**
 * Ensures that a user document has a jumpaTag, referralCode, and country assigned.
 * Backfills if any are missing and saves to database.
 */
export async function ensureUserJumpaFields(
  userId: string,
): Promise<IUser | null> {
  await connectDB();
  const user = await User.findById(userId);
  if (!user) return null;

  let needsSave = false;

  if (!user.jumpaTag) {
    user.jumpaTag = await generateUniqueJumpaTag(user.name, user.email);
    needsSave = true;
  }

  if (!user.referralCode) {
    user.referralCode = await generateUniqueReferralCode();
    needsSave = true;
  }

  if (!user.country) {
    try {
      const country = await detectUserCountry();
      if (country) {
        user.country = country;
        needsSave = true;
      }
    } catch (err) {
      console.error("[UserProfile] Error detecting country for backfill:", err);
    }
  }

  if (needsSave) {
    await user.save();
    console.log(
      `[UserProfile] updated missing fields (tag: ${user.jumpaTag}, referral: ${user.referralCode}, country: ${user.country}) for user ${user._id}`,
    );
  }

  return user;
}
