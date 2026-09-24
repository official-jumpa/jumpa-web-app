import type { Metadata } from "next";
import { Suspense } from "react";
import { AppColumn } from "@/components/ui/app-column";
import { Toaster } from "@/components/ui/toast";
import { AuthGuard, useAuthContext } from "@/components/auth/AuthGuard";
import { UserProfileProvider } from "@/components/profile/user-profile-provider";
import { BottomNav } from "@/components/home/bottom-nav";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";

import { cookies } from "next/headers";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getUserPreferences } from "@/lib/functions/userPreferenceFunctions";
import { AutoLockProvider } from "@/components/auth/auto-lock-provider";

export { AuthGuard, useAuthContext };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};
/** Signed-in column. Same shell as the auth flow. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let session = null;
  let preferences = null;
  let isUnlocked = false;

  try {
    session = await getCachedAuthSession();
    if (session?.user?.id) {
      preferences = await getUserPreferences(session.user.id);
    }
    const cookieStore = await cookies();
    isUnlocked = cookieStore.get("jumpa_unlocked")?.value === "true";
  } catch (err) {
    console.warn("[AppLayout] Session resolution:", err);
  }

  const initialUser = (session?.user as any) ?? null;

  return (
    <AppColumn>
      <AuthGuard initialSession={session} initialUser={initialUser}>
        <AutoLockProvider
          initialTimeout={preferences?.autoLockTimeout}
          initialIsLocked={!isUnlocked}
        >
          <UserProfileProvider initialProfile={initialUser}>
            {children}
            <Suspense fallback={null}>
              <BottomNav />
            </Suspense>
          </UserProfileProvider>
          {/* One stack for the whole signed-in app; every flow raises into it. */}
          <Toaster />
          <PullToRefresh />
        </AutoLockProvider>
      </AuthGuard>
    </AppColumn>
  );
}

