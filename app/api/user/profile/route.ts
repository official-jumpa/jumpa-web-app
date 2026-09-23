import { NextRequest, NextResponse } from "next/server";
import { auth as authInstance } from "@/lib/auth";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { getUserById, updateUserProfile } from "@/lib/functions/userFunctions";
import { updateProfileSchema } from "@/lib/validations/user.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * GET /api/user/profile
 * Retrieves the authenticated user's current profile from the database.
 */
export async function GET() {
  const auth = await requireActiveUser({
    requireWallet: false,
    rateLimit: { tier: "low", action: "user_profile_get" },
  });
  if (!auth.ok) return auth.response;

  try {
    const user = await getUserById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: user._id,
        name: user.name ?? null,
        nickname: user.nickname ?? null,
        jumpaTag: user.jumpaTag ?? null,
        email: user.email,
        image: user.image ?? null,
        country: user.country ?? null,
        status: user.status,
      },
    });
  } catch (err: any) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/user/profile
 * Updates the authenticated user's profile fields (e.g. nickname, name, country, image).
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireActiveUser({
    requireWallet: false,
    rateLimit: { tier: "medium", action: "user_profile_update" },
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const updated = await updateUserProfile(auth.userId, validation.data);
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Keep Better-Auth session cookie synchronized
    let authHeaders: Headers | undefined;
    try {
      const authRes = await authInstance.api.updateUser({
        body: validation.data,
        headers: req.headers,
        asResponse: true,
      });
      authHeaders = authRes.headers;
    } catch (authErr) {
      console.warn("Error:", authErr);
    }

    return NextResponse.json(
      {
        success: true,
        profile: {
          id: updated._id,
          name: updated.name ?? null,
          nickname: updated.nickname ?? null,
          jumpaTag: updated.jumpaTag ?? null,
          email: updated.email,
          image: updated.image ?? null,
          country: updated.country ?? null,
          status: updated.status,
        },
      },
      authHeaders ? { headers: authHeaders } : undefined,
    );
  } catch (err: any) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update profile" },
      { status: 500 },
    );
  }
}
