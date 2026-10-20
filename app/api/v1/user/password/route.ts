import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import {
  setUserLoginPassword,
  logUserActivity,
} from "@/lib/functions/userFunctions";
import {
  findWalletById,
  findWalletForUser,
} from "@/lib/functions/walletFunctions";
import { resolveNextOnboardingRoute } from "@/app/api/v1/user/onboarding/route";
import { setLoginPasswordSchema } from "@/lib/validations/user.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { environment } from "@/lib/environment";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/user/password
 *
 * Sets the user's initial 6-digit login password during progressive onboarding.
 * Hashes with bcrypt, unlocks the local session for 15 minutes, and resolves nextRoute.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth({
      rateLimit: { tier: "high", action: "set_login_password" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const body = await req.json().catch(() => ({}));
    const validation = setLoginPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { password } = validation.data;
    const loginPasswordHash = await bcrypt.hash(password, 10);
    const updatedUser = await setUserLoginPassword(
      session.user.id,
      loginPasswordHash,
    );

    const wallet = updatedUser?.activeWalletId
      ? await findWalletById(updatedUser.activeWalletId)
      : await findWalletForUser(session.user.id);

    const nextRoute = resolveNextOnboardingRoute(updatedUser, wallet);

    logUserActivity({
      userId: session.user.id,
      action: "LOGIN_PASSWORD_SET",
      req,
    }).catch((e) =>
      console.error(
        `[UserPassword] Error: ${formatOneLineError(e)}`,
      ),
    );

    const response = NextResponse.json({
      success: true,
      data: {
        message: "Login password set successfully",
        nextRoute,
      },
    });

    response.cookies.set("jumpa_unlocked", "true", {
      path: "/",
      sameSite: "lax",
      secure: environment.IS_PRODUCTION,
      maxAge: 15 * 60,
    });

    return response;
  } catch (err: any) {
    console.error(`[UserPassword] Error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
