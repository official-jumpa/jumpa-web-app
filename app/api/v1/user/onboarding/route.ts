import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import { getUserById } from "@/lib/functions/userFunctions";
import {
  findWalletById,
  findWalletForUser,
} from "@/lib/functions/walletFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

/** Resolves the next route a user must complete in onboarding */
export function resolveNextOnboardingRoute(user: any, wallet: any): string {
  const hasPhone = Boolean(user?.phoneNumberVerified || user?.phoneSkipped);
  const hasPassword = Boolean(user?.loginPasswordHash);
  const hasPin = Boolean(wallet?.pinHash);

  if (!hasPhone) return "/sign-up/phone";
  if (!hasPassword) return "/sign-up/password";
  if (!hasPin) return "/sign-up/pin";
  return "/home";
}

/**
 * GET /api/v1/user/onboarding
 *
 * Resolves the authenticated user's progressive security and onboarding status:
 * - hasPhone: SMS verified or explicitly skipped
 * - hasPassword: 6-digit login password set
 * - hasTag: Unique Jumpa handle chosen
 * - hasPin: 4-digit transaction PIN set on wallet
 * - nextRoute: Next destination route for guards and signup flow
 * - isComplete: All required steps finished
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth({
      rateLimit: { tier: "medium", action: "user_onboarding_status" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const user = await getUserById(session.user.id);
    const wallet = user?.activeWalletId
      ? await findWalletById(user.activeWalletId)
      : await findWalletForUser(session.user.id);

    const hasPhone = Boolean(user?.phoneNumberVerified || user?.phoneSkipped);
    const hasPassword = Boolean(user?.loginPasswordHash);
    const hasTag = Boolean(user?.jumpaTag);
    const hasPin = Boolean(wallet?.pinHash);
    const nextRoute = resolveNextOnboardingRoute(user, wallet);

    return NextResponse.json({
      success: true,
      data: {
        hasPhone,
        hasPassword,
        hasTag,
        hasPin,
        isV3Wallet: Boolean(wallet && wallet.pinVersion === "v3"),
        nextRoute,
        userStatus: user?.status || "active",
        nickname: user?.nickname ?? null,
        jumpaTag: user?.jumpaTag ?? null,
        isComplete: hasPhone && hasPassword && hasPin,
      },
    });
  } catch (err: any) {
    console.error(`[UserOnboarding] Error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
