"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

interface OnboardingStatus {
  hasPassword: boolean;
  hasTag: boolean;
  hasPin: boolean;
  needsPinMigration?: boolean;
  nextRoute?: string;
  isComplete: boolean;
}

/**
 * Guard mounted in app/(auth)/layout.tsx to prevent authenticated users
 * from landing on signup or migration steps they have already completed.
 */
export function AuthStepGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  const user = session?.user;
  const isAuthenticated = Boolean(user?.id);

  useEffect(() => {
    // Unauthenticated visitors can access all auth/signup pages freely
    if (isPending || !isAuthenticated || !user?.id) return;

    let active = true;

    async function verifyStep() {
      try {
        const res = await fetch("/api/auth/wallet-setup");
        if (!res.ok || !active) return;
        const status: OnboardingStatus = await res.json();

        // 1. Already has password -> redirect away from /sign-up/password
        const onPasswordPage = pathname?.startsWith("/sign-up/password");
        if (onPasswordPage && status.hasPassword) {
          router.replace(status.nextRoute || "/home");
          return;
        }

        // 2. Already has tag -> redirect away from /sign-up/tag
        const onTagPage = pathname?.startsWith("/sign-up/tag");
        if (onTagPage && status.hasTag) {
          router.replace(status.nextRoute || "/home");
          return;
        }

        // 3. Already has wallet & pin -> redirect away from /sign-up/pin or /import-wallet
        const onPinPage = pathname?.startsWith("/sign-up/pin");
        const onImportPage = pathname?.startsWith("/import-wallet");
        if ((onPinPage || onImportPage) && status.hasPin) {
          router.replace(status.nextRoute || "/home");
          return;
        }

        // 4. Doesn't need pin migration -> redirect away from /migrate-pin
        const onMigratePin = pathname?.startsWith("/migrate-pin");
        if (onMigratePin && !status.needsPinMigration) {
          router.replace("/home");
          return;
        }

        // 5. Already fully complete -> redirect away from /sign-in
        const onSignIn = pathname?.startsWith("/sign-in");
        if (onSignIn && status.isComplete) {
          router.replace("/home");
          return;
        }
      } catch (err) {
        console.error("[AuthStepGuard] Error verifying onboarding step:", err);
      }
    }

    verifyStep();

    return () => {
      active = false;
    };
  }, [isPending, isAuthenticated, user?.id, pathname, router]);

  return <>{children}</>;
}
