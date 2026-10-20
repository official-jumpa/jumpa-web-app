import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import {
  getUserById,
  recordUserActivity,
  getUserPreferences,
} from "@/lib/functions/userFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

const TIMEOUT_SECONDS: Record<string, number> = {
  "15m": 15 * 60,
  "30m": 30 * 60,
  "1h": 3600,
  "4h": 14400,
  "7d": 7 * 24 * 3600,
};

/**
 * POST /api/auth/lock
 * Verifies 6-digit login password, records activity, and issues jumpa_unlocked cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({
      rateLimit: { tier: "critical", action: "verify_password" },
    });
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const password =
      typeof body.password === "string" ? body.password.trim() : "";

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required", verified: false },
        { status: 400 },
      );
    }

    const user = await getUserById(auth.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found", verified: false },
        { status: 404 },
      );
    }

    if (!user.loginPasswordHash) {
      return NextResponse.json(
        {
          success: false,
          error: "Login password is not set on this account",
          verified: false,
        },
        { status: 400 },
      );
    }

    const isValid = await bcrypt.compare(password, user.loginPasswordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect login password", verified: false },
        { status: 400 },
      );
    }

    recordUserActivity({
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

    const maxAgeSec = TIMEOUT_SECONDS[timeoutSetting] || 15 * 60;
    const isSecure = process.env.NODE_ENV === "production";

    const response = NextResponse.json({
      success: true,
      data: {
        verified: true,
        timeout: timeoutSetting,
      },
    });

    response.cookies.set("jumpa_unlocked", "true", {
      path: "/",
      maxAge: maxAgeSec,
      sameSite: "lax",
      secure: isSecure,
    });

    return response;
  } catch (error: any) {
    console.error(`[lock] Error: ${formatOneLineError(error)}`);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to verify password",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/auth/lock
 * Immediately locks the app by expiring the jumpa_unlocked cookie.
 */
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    locked: true,
    data: { locked: true },
  });

  response.cookies.set("jumpa_unlocked", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
