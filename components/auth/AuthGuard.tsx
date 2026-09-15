"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  status?: "pending" | "active" | "banned" | "suspended" | "deleted";
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  jumpaTag?: string | null;
  loginPasswordHash?: string | null;
  referralCode?: string | null;
  country?: string | null;
  activeWalletId?: string | null;
  [key: string]: any;
}

export interface OnboardingStatus {
  hasPassword: boolean;
  hasTag: boolean;
  hasPin: boolean;
  needsPinMigration?: boolean;//delete once everyone has migrated to v2
  nextRoute?: string;
  userStatus?: "pending" | "active" | "banned" | "suspended" | "deleted";
  isComplete: boolean;
}

export interface AuthContextValue {
  session: any;
  user: AuthUser;
  isPending: boolean;
  isAuthenticated: boolean;
  status: OnboardingStatus | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Hook to consume the verified user, session, and onboarding status anywhere under an AuthGuard.
 */
export function useAuthContext(): AuthContextValue | null {
  return useContext(AuthContext);
}

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Centralized authentication guard for protected areas.
 * - Displays a clean loading state while session & status resolve.
 * - Redirects unauthenticated users immediately to /onboarding.
 * - Enforces progressive setup: Login Password -> Jumpa Tag -> Transaction PIN.
 * - Provides verified session, user & setup context to children.
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  const user = session?.user as AuthUser | undefined;
  const isAuthenticated = Boolean(user?.id);

  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const hasVerifiedOnce = useRef(false);

  // 1. Handle unauthenticated users
  useEffect(() => {
    if (!isPending && !isAuthenticated) {
      router.replace("/onboarding");
    }
  }, [isPending, isAuthenticated, router]);

  const checkStatus = useCallback(async () => {
    if (!hasVerifiedOnce.current) {
      setCheckingStatus(true);
    }
    try {
      const res = await fetch("/api/auth/wallet-setup");
      if (!res.ok) throw new Error("Failed to load status");
      const data: OnboardingStatus = await res.json();

      setStatus(data);
      hasVerifiedOnce.current = true;
      setCheckingStatus(false);

      // If user is on an onboarding step they have ALREADY completed, forward them to the next required step
      if (
        (pathname?.startsWith("/sign-up/password") && data.hasPassword) ||
        (pathname?.startsWith("/sign-up/tag") && data.hasTag) ||
        (pathname?.startsWith("/sign-up/pin") && data.hasPin)
      ) {
        if (data.nextRoute) {
          router.replace(data.nextRoute);
        } else if (!data.hasPassword) {
          router.replace("/sign-up/password");
        } else if (!data.hasTag) {
          router.replace("/sign-up/tag");
        } else if (!data.hasPin) {
          router.replace("/sign-up/pin");
        } else if (data.needsPinMigration) {
          router.replace("/migrate-pin");
        } else {
          router.replace("/home");
        }
        return;
      }

      // If on an auth/signup/migration page that they still need, don't interrupt
      //delete once everyone has migrated to v2
      if (
        pathname?.startsWith("/sign-up") ||
        pathname?.startsWith("/onboarding") ||
        pathname?.startsWith("/migrate-pin")
      ) {
        return;
      }

      // Sequential onboarding check: Password -> Tag -> PIN / Migration
      if (data.nextRoute && data.nextRoute !== "/home") {
        router.replace(data.nextRoute);
      } else if (!data.hasPassword) {
        router.replace("/sign-up/password");
      } else if (!data.hasTag) {
        router.replace("/sign-up/tag");
      } else if (!data.hasPin) {
        router.replace("/sign-up/pin");
      } else if (data.needsPinMigration) {
        router.replace("/migrate-pin");//delete once everyone has migrated to v2
      }
    } catch (err) {
      console.error("[AuthGuard] Status check error:", err);
      hasVerifiedOnce.current = true;
      setCheckingStatus(false);
    }
  }, [pathname, router]);

  // 2. Check onboarding status for authenticated users
  useEffect(() => {
    if (!isPending && isAuthenticated && user?.id) {
      // If user has already completed onboarding, don't re-check on sibling tab switches
      if (
        status?.isComplete &&
        !pathname?.startsWith("/sign-up") &&
        !pathname?.startsWith("/onboarding") &&
        !pathname?.startsWith("/migrate-pin")
      ) {
        return;
      }
      checkStatus();
    }
  }, [isPending, isAuthenticated, user?.id, checkStatus, status?.isComplete, pathname]);

  // While checking session or onboarding status, show clean loading shell
  if (isPending || (isAuthenticated && checkingStatus)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-jumpa-primary-600 border-t-transparent" />
      </div>
    );
  }

  //later the UI will be improved
  const userStatus = user?.status || status?.userStatus || "active";
  if (userStatus === "banned" || userStatus === "suspended" || userStatus === "deleted") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-3 rounded-2xl border border-red-200 bg-red-50/50 p-6">
          <h2 className="text-lg font-bold text-red-700">
            {userStatus === "deleted" ? "Account Deleted" : "Account Suspended"}
          </h2>
          <p className="text-sm text-neutral-600">
            {userStatus === "banned"
              ? "Your account has been permanently restricted from accessing Jumpa."
              : userStatus === "deleted"
              ? "This account has been scheduled for deletion. If you believe this is a mistake, please contact support."
              : "Your account is temporarily suspended. Please contact support for assistance."}
          </p>
        </div>
      </div>
    );
  }

  // If unauthenticated or setup is incomplete on a protected page, render nothing while redirect takes place
  if (!isAuthenticated || !user || (!checkingStatus && status && !status.isComplete)) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isPending,
        isAuthenticated,
        status,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
