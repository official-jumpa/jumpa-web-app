"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  jumpaTag?: string | null;
  referralCode?: string | null;
  country?: string | null;
  activeWalletId?: string | null;
  [key: string]: any;
}

export interface AuthContextValue {
  session: any;
  user: AuthUser;
  isPending: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Hook to consume the verified user and session anywhere under an AuthGuard.
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
 * - Displays a clean loading state while session rehydrates.
 * - Redirects unauthenticated users immediately to /onboarding.
 * - Provides verified session & user context to children.
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const user = session?.user as AuthUser | undefined;
  const isAuthenticated = Boolean(user?.id);

  useEffect(() => {
    if (!isPending && !isAuthenticated) {
      router.replace("/onboarding");
    }
  }, [isPending, isAuthenticated, router]);

  // While checking session, show minimal centered loading shell
  if (isPending) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-jumpa-primary-600 border-t-transparent" />
      </div>
    );
  }

  // If unauthenticated, render nothing while redirect takes place
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isPending,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
