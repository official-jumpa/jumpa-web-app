import { connectDB } from "@/lib/db";
import { UserPreference, type IUserPreference } from "@/models/UserPreference";
import { User } from "@/models/User";
import { generateId } from "@/lib/schema-ids";
import type { UpdatePreferencesInput } from "@/lib/validations/preference.validation";
import type { NotificationType } from "@/models/Notification";

export const DEFAULT_USER_PREFERENCES: Omit<
  IUserPreference,
  "_id" | "userId" | "createdAt" | "updatedAt"
> = {
  pushNotifications: true,
  emailNotifications: true,
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
