import { NextRequest, NextResponse } from "next/server";
import { auth as authInstance } from "@/lib/auth";
import {
  requireActiveUser,
  requireAuth,
} from "@/lib/functions/permissionFunctions";
import {
  getUserById,
  updateUserProfile,
  logUserActivity,
  getUserPreferences,
  updateUserPreferences,
  deleteUserAndAccountData,
} from "@/lib/functions/userFunctions";
import {
  updateUserSchema,
  deleteAccountSchema,
} from "@/lib/validations/user.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { clearSession, attachClearSessionCookies } from "@/lib/session";
import {
  formatOneLineError,
  isTimeoutError,
} from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

/** Formats user profile for client consumption, omitting internal DB fields */
function formatProfileDTO(user: any) {
  if (!user) return null;
  return {
    id: user._id,
    name: user.name ?? null,
    nickname: user.nickname ?? null,
    jumpaTag: user.jumpaTag ?? null,
    email: user.email,
    phoneNumber: user.phoneNumber ?? null,
    phoneNumberVerified: Boolean(user.phoneNumberVerified),
    image: user.image ?? null,
    country: user.country ?? null,
    status: user.status,
  };
}

/** Formats user preferences, stripping Mongo _id, userId, and __v */
function formatPreferencesDTO(pref: any) {
  if (!pref) return null;
  return {
    pushNotifications: pref.pushNotifications ?? true,
    emailNotifications: pref.emailNotifications ?? true,
    newLoginDetected: pref.newLoginDetected ?? true,
    haptics: pref.haptics ?? true,
    inAppSounds: pref.inAppSounds ?? true,
    autoLockTimeout: pref.autoLockTimeout ?? "15m",
  };
}

/**
 * GET /api/v1/user
 * Retrieves the authenticated user's current profile and preferences in a single call.
 */
export async function GET() {
  const auth = await requireActiveUser({
    requireWallet: false,
    rateLimit: { tier: "low", action: "user_get" },
  });
  if (!auth.ok) return auth.response;

  try {
    const fetchPromise = Promise.all([
      getUserById(auth.userId),
      getUserPreferences(auth.userId),
    ]);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("User fetch timeout")), 8000),
    );

    const [user, preferences] = await Promise.race([
      fetchPromise,
      timeoutPromise,
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      profile: formatProfileDTO(user),
      preferences: formatPreferencesDTO(preferences),
    });
  } catch (err: any) {
    const isTimeout = isTimeoutError(err);
    console.error(
      `[user] ${isTimeout ? "Timeout" : "Error"}: ${formatOneLineError(err)}`,
    );

    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? "User service timed out. Please try again."
          : "Failed to retrieve user profile.",
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}

/**
 * PATCH /api/v1/user
 * Partially updates user profile and/or preferences.
 * Strict field isolation guarantees unpassed fields are never touched or reset.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireActiveUser({
    requireWallet: false,
    rateLimit: { tier: "medium", action: "user_update" },
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const data = validation.data;

    // 1. Extract Profile updates (only if explicitly supplied and defined)
    const profileUpdates: Record<string, any> = {};
    const profileKeys = [
      "nickname",
      "jumpaTag",
      "country",
      "image",
    ] as const;

    for (const key of profileKeys) {
      const val = data.profile?.[key] ?? (data as any)[key];
      if (val !== undefined) {
        profileUpdates[key] = val;
      }
    }

    // 2. Extract Preference updates (only if explicitly supplied and defined)
    const preferenceUpdates: Record<string, any> = {};
    const prefKeys = [
      "pushNotifications",
      "emailNotifications",
      "newLoginDetected",
      "haptics",
      "inAppSounds",
      "autoLockTimeout",
    ] as const;

    for (const key of prefKeys) {
      const val = data.preferences?.[key] ?? (data as any)[key];
      if (val !== undefined) {
        preferenceUpdates[key] = val;
      }
    }

    const hasProfileUpdates = Object.keys(profileUpdates).length > 0;
    const hasPreferenceUpdates = Object.keys(preferenceUpdates).length > 0;

    if (!hasProfileUpdates && !hasPreferenceUpdates) {
      return NextResponse.json(
        { success: false, error: "No valid fields provided for update" },
        { status: 400 },
      );
    }

    // Enforce 8s timeout ceiling
    const updateTask = async () => {
      let authHeaders: Headers | undefined;
      let updatedProfile: ReturnType<typeof formatProfileDTO> | undefined;
      let updatedPreferences: ReturnType<typeof formatPreferencesDTO> | undefined;

      // 3. Update User profile if profile fields were supplied
      if (hasProfileUpdates) {
        if (profileUpdates.jumpaTag) {
          const existingUser = await getUserById(auth.userId);
          if (existingUser?.jumpaTag) {
            throw new Error("Jumpa Tag cannot be changed once set");
          }
        }

        const updatedUser = await updateUserProfile(
          auth.userId,
          profileUpdates,
        );
        if (!updatedUser) {
          throw new Error("User not found");
        }
        updatedProfile = formatProfileDTO(updatedUser);

        // Synchronize Better-Auth session cookie
        try {
          const authRes = await authInstance.api.updateUser({
            body: profileUpdates,
            headers: req.headers,
            asResponse: true,
          });
          authHeaders = authRes.headers;
        } catch (authErr) {
          console.warn(
            `[user] warning: ${formatOneLineError(authErr)}`,
          );
        }
      }

      // 4. Update Preferences if preference fields were supplied
      if (hasPreferenceUpdates) {
        const updatedPrefDoc = await updateUserPreferences(auth.userId, preferenceUpdates);
        updatedPreferences = formatPreferencesDTO(updatedPrefDoc);
        logUserActivity({
          userId: auth.userId,
          action: "PREFERENCE_UPDATED",
          details: { updatedFields: Object.keys(preferenceUpdates) },
          req,
        }).catch(() => {});
      }

      return {
        authHeaders,
        profile: updatedProfile,
        preferences: updatedPreferences,
      };
    };

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("User update timeout")), 8000),
    );

    const result = await Promise.race([updateTask(), timeoutPromise]);

    return NextResponse.json(
      {
        success: true,
        ...(result.profile ? { profile: result.profile } : {}),
        ...(result.preferences ? { preferences: result.preferences } : {}),
      },
      result.authHeaders ? { headers: result.authHeaders } : undefined,
    );
  } catch (err: any) {
    const isTimeout = isTimeoutError(err);
    const isTagError = err.message === "Jumpa Tag cannot be changed once set";
    const isNotFound = err.message === "User not found";

    if (isTagError || isNotFound) {
      return NextResponse.json({ error: err.message }, { status: isNotFound ? 404 : 400 });
    }

    console.error(
      `[user] ${isTimeout ? "Timeout" : "Error"}: ${formatOneLineError(err)}`,
    );

    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? "User update timed out. Please try again."
          : "Failed to update user profile.",
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}

/**
 * DELETE /api/v1/user
 * Soft-deletes user record, marks status as "deleted", purges all active sessions,
 * terminates Better Auth session, and clears session cookies.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth({
    rateLimit: { tier: "critical", action: "delete_account" },
  });
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const validation = deleteAccountSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(formatZodError(validation.error), { status: 400 });
  }

  const userId = auth.userId;

  try {
    await logUserActivity({
      userId,
      action: "ACCOUNT_DELETED",
      req,
    });
    await deleteUserAndAccountData(userId);
  } catch (err: any) {
    console.error(`[user] Failed to delete account: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { success: false, error: "Could not delete the account. Please try again." },
      { status: 500 },
    );
  }

  try {
    await authInstance.api.signOut({ headers: req.headers });
  } catch (err) {
    console.warn(`Error: ${formatOneLineError(err)}`);
  }

  await clearSession();

  const response = NextResponse.json({
    success: true,
    message: "Account deleted",
  });
  return attachClearSessionCookies(response);
}

