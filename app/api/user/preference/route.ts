import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/lib/functions/userPreferenceFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { updatePreferencesSchema } from "@/lib/validations/preference.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * GET /api/user/preference
 * Returns current preferences for the authenticated user.
 */
export async function GET(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "low", action: "preference_get" },
  });
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  try {
    const preferences = await getUserPreferences(userId);
    return NextResponse.json({ preferences });
  } catch (err: any) {
    console.error("[GET /api/user/preference] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve preferences" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/user/preference
 * Updates user notification and app preferences.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireActiveUser({
    rateLimit: { tier: "medium", action: "preference_update" },
  });
  if (!auth.ok) return auth.response;
  const { userId } = auth;

  try {
    const body = await req.json();
    const validation = updatePreferencesSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const preferences = await updateUserPreferences(userId, validation.data);

    logUserActivity({
      userId,
      action: "PREFERENCE_UPDATED",
      details: { updatedFields: Object.keys(validation.data) },
      req,
    }).catch(() => {});

    return NextResponse.json({ success: true, preferences });
  } catch (err: any) {
    console.error("[PATCH /api/user/preference] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update preferences" },
      { status: 500 },
    );
  }
}
