import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clearSession, attachClearSessionCookies } from "@/lib/session";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 * Signs out the Better Auth session, logs user activity, and clears all session cookies.
 */
export async function POST() {
  const reqHeaders = await headers();

  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      await logUserActivity({
        userId: session.user.id,
        action: "USER_LOGOUT",
        req: { headers: reqHeaders },
      });
    }

    await auth.api.signOut({
      headers: reqHeaders,
    });
  } catch (err) {
    console.warn(`[logout] Error: ${formatOneLineError(err)}`);
  }

  await clearSession();

  const response = NextResponse.json({
    success: true,
    message: "Logged out",
  });

  // Ensure jumpa_unlocked is also cleared on logout
  response.cookies.set("jumpa_unlocked", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return attachClearSessionCookies(response);
}
