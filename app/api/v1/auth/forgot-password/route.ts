import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import {
  getUserByEmail,
  setUserLoginPassword,
  deleteAllUserSessions,
  verifyAndConsumeEmailOtp,
  logUserActivity,
} from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { forgotPasswordSchema } from "@/lib/validations/user.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import { attachClearSessionCookies } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/forgot-password
 *
 * Authenticated endpoint allowing users locked out by auto-lock
 * to reset their 6-digit login password using an email verification OTP.
 * On success, revokes all active sessions and requires signing in again.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth({
      rateLimit: { tier: "critical", action: "forgot_password" },
    });
    if (!authResult.ok) return authResult.response;

    const body = await req.json().catch(() => ({}));
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { email, otp, newPassword } = validation.data;

    // Verify the email matches the authenticated session user
    if (authResult.user.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Email does not match." },
        { status: 403 },
      );
    }

    // 1. Atomically verify and consume the email verification OTP
    const otpCheck = await verifyAndConsumeEmailOtp(email, otp);
    if (!otpCheck.ok) {
      return NextResponse.json(
        { success: false, error: otpCheck.error || "Invalid or expired verification code." },
        { status: 400 },
      );
    }

    // 2. Locate user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "No account found with this email address." },
        { status: 404 },
      );
    }

    // 3. Hash new password and save
    const loginPasswordHash = await bcrypt.hash(newPassword, 10);
    const updated = await setUserLoginPassword(user._id, loginPasswordHash);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to update login password. Please try again." },
        { status: 500 },
      );
    }

    // 4. Revoke all active sessions for security (user must sign in again)
    await deleteAllUserSessions(user._id).catch((e) =>
      console.error(`[ForgotPassword] Session cleanup error: ${formatOneLineError(e)}`),
    );

    // 5. Activity log & notification
    logUserActivity({
      userId: user._id,
      action: "PIN_CHANGED",
      details: { kind: "login", mode: "forgot" },
      req,
    }).catch((e) =>
      console.error(`[ForgotPassword] Log error: ${formatOneLineError(e)}`),
    );

    createNotification({
      userId: user._id,
      tab: "activities",
      type: "PIN_CHANGED",
      title: "Login Password Reset",
      body: "Your login password was successfully reset",
      metadata: { kind: "login" },
      link: "/profile/settings?section=security",
    }).catch((e) =>
      console.error(`[ForgotPassword] Notification error: ${formatOneLineError(e)}`),
    );

    const response = NextResponse.json({
      success: true,
      message: "Login password successfully reset. Please sign in to continue.",
    });

    // Clear all session, unlock, and secure authentication cookies
    return attachClearSessionCookies(response);
  } catch (err: any) {
    console.error(`[ForgotPassword] Error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to reset password at this time. Please try again.",
      },
      { status: 500 },
    );
  }
}
