import { redirect } from "next/navigation";
import { resolveNextOnboardingRoute } from "@/app/api/v1/user/onboarding/route";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getUserById } from "@/lib/functions/userFunctions";
import {
  findWalletById,
  findWalletForUser,
} from "@/lib/functions/walletFunctions";

export type AuthRouteStep =
  | "sign-in"
  | "sign-up"
  | "verify-code"
  | "forgot-password"
  | "phone"
  | "phone-verify"
  | "password"
  | "password-confirm"
  | "tag"
  | "pin"
  | "pin-confirm"
  | "biometrics"
  | "done";

export interface GuardAuthPageOptions {
  step: AuthRouteStep;
  searchParams?: Record<string, string | string[] | undefined>;
}

const PUBLIC_UNAUTHENTICATED_STEPS: Set<AuthRouteStep> = new Set([
  "sign-in",
  "sign-up",
  "verify-code",
  "forgot-password",
]);

/**
 * Server-side route guard executed during Server Component rendering of auth pages.
 *
 * Enforces:
 * 1. Unauthenticated visitors can only access public auth pages (sign-in, sign-up, verify-code, forgot-password).
 *    Any attempt to access internal setup steps redirects immediately to /sign-in.
 * 2. Biometrics is mobile-only: web visits redirect to /sign-up/done (or /sign-up/pin).
 * 3. Authenticated users with completed accounts (isComplete) are redirected to /home
 *    (unless updating phone via bank flow: ?from=bank).
 * 4. Authenticated users in incomplete onboarding are routed strictly to their active step:
 *    Skipping ahead or revisiting completed steps redirects to the correct route.
 */
export async function guardAuthPage({
  step,
  searchParams = {},
}: GuardAuthPageOptions): Promise<void> {
  const session = await getCachedAuthSession();
  const userId = session?.user?.id;

  // 1. Unauthenticated Visitor Handling
  if (!userId) {
    if (PUBLIC_UNAUTHENTICATED_STEPS.has(step)) {
      return; // Allowed
    }
    // Block access to any internal setup screen and send to sign-up entrypoint
    redirect("/sign-up");
  }

  // 2. Authenticated User Handling
  const user = await getUserById(userId);
  const wallet = user?.activeWalletId
    ? await findWalletById(user.activeWalletId)
    : await findWalletForUser(userId);

  const hasPhone = Boolean(user?.phoneNumberVerified || user?.phoneSkipped);
  const hasPassword = Boolean(user?.loginPasswordHash);
  const hasPin = Boolean(wallet?.pinHash);
  const isComplete = hasPhone && hasPassword && hasPin;
  const nextRoute = resolveNextOnboardingRoute(user, wallet);

  // A. Fully Completed Account
  if (isComplete) {
    // Exception: bank transfer flow allows verified users to add/update phone
    if (step === "phone" && searchParams?.from === "bank") {
      return;
    }
    redirect("/home");
  }

  // B. Incomplete Onboarding
  if (step === "sign-in" || step === "sign-up") {
    // Already authenticated, route them to where they left off
    redirect(nextRoute);
  }

  // C. Biometrics is mobile-only: web users should never visit this screen
  if (step === "biometrics") {
    redirect(hasPin ? "/sign-up/done" : "/sign-up/pin");
  }

  // D. Progressive Step Enforcements:
  switch (step) {
    case "phone":
    case "phone-verify": {
      if (hasPhone && searchParams?.from !== "bank") {
        redirect(nextRoute);
      }
      return;
    }

    case "password":
    case "password-confirm": {
      if (!hasPhone) {
        redirect("/sign-up/phone");
      }
      if (hasPassword) {
        redirect(nextRoute);
      }
      return;
    }

    case "tag": {
      if (!hasPassword) {
        redirect("/sign-up/password");
      }
      if (user?.jumpaTag) {
        redirect(nextRoute);
      }
      return;
    }

    case "pin":
    case "pin-confirm": {
      if (!hasPassword) {
        redirect("/sign-up/password");
      }
      if (hasPin) {
        redirect(nextRoute);
      }
      return;
    }

    case "done": {
      if (!hasPin) {
        redirect("/sign-up/pin");
      }
      return;
    }

    case "verify-code": {
      return;
    }

    default:
      return;
  }
}
