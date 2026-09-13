import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clearSession } from "@/lib/session";
import { logUserActivity } from "@/lib/functions/userFunctions";

/** POST /api/auth/logout — signs out the BetterAuth session */
export async function POST() {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
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

  return NextResponse.json({ message: "Logged out" });
}
