import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clearSession } from "@/lib/session";

/** POST /api/auth/logout — signs out the BetterAuth session */
export async function POST() {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
  } catch (err) {
    console.warn("[Logout] signOut error:", err);
  }

  await clearSession();

  return NextResponse.json({ message: "Logged out" });
}
