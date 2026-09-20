import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clearSession, attachClearSessionCookies } from "@/lib/session";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout — signs out the BetterAuth session */
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
    console.warn("[Logout] signOut error:", err);
  }

  await clearSession();

  const response = NextResponse.json({ message: "Logged out" });
  return attachClearSessionCookies(response);
}
