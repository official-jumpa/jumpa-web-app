import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import { getUserById, recordUserActivity } from "@/lib/functions/userFunctions";
import { getUserPreferences } from "@/lib/functions/userPreferenceFunctions";

const TIMEOUT_SECONDS: Record<string, number> = {
  "15m": 15 * 60,
  "30m": 30 * 60,
  "1h": 3600,
  "4h": 14400,
  "7d": 7 * 24 * 3600,
};

/**
 * POST /api/auth/verify-password
 * Verifies the user's 6-digit login password and sets the jumpa_unlocked cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password.trim() : "";

    if (!password) {
      return NextResponse.json(
        { error: "Password is required", verified: false },
        { status: 400 },
      );
    }

    const user = await getUserById(auth.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found", verified: false },
        { status: 404 },
      );
    }

    if (!user.loginPasswordHash) {
      return NextResponse.json(
        { error: "Login password is not set", verified: false },
        { status: 400 },
      );
    }

    const isValid = await bcrypt.compare(password, user.loginPasswordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect password", verified: false },
        { status: 400 },
      );
    }

    await recordUserActivity({
      userId: auth.userId,
      action: "LOGIN_PASSWORD_VERIFIED",
      details: { method: "auto_lock_unlock" },
    }).catch(() => {});

    // Retrieve user's configured auto-lock timeout
    let timeoutSetting = "15m";
    try {
      const prefs = await getUserPreferences(auth.userId);
      if (prefs?.autoLockTimeout) {
        timeoutSetting = prefs.autoLockTimeout;
      }
    } catch {}

    const response = NextResponse.json(
      { success: true, verified: true, timeout: timeoutSetting },
      { status: 200 },
    );

    const isSecure = process.env.NODE_ENV === "production";
    const maxAgeSec = TIMEOUT_SECONDS[timeoutSetting] || 15 * 60;
    response.cookies.set("jumpa_unlocked", "true", {
      path: "/",
      maxAge: maxAgeSec,
      sameSite: "lax",
      secure: isSecure,
    });

    return response;
  } catch (error: any) {
    console.error("[VerifyPassword] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to verify password", verified: false },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/auth/verify-password
 * Immediately locks the app by expiring the jumpa_unlocked cookie.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true, locked: true });
  response.cookies.set("jumpa_unlocked", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

