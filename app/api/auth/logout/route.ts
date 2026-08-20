import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";

/** POST /api/auth/logout — signs out the BetterAuth session */
export async function POST() {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
  } catch (err) {
    console.warn("[Logout] signOut error:", err);
  }

  const cookieStore = await cookies();
  cookieStore.delete("jumpa_session");
  cookieStore.delete("selected_wallet_address");

  return NextResponse.json({ message: "Logged out" });
}
