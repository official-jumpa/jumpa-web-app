import type { Metadata } from "next";
import { Suspense } from "react";
import { AppColumn } from "@/components/ui/app-column";
import { Toaster } from "@/components/ui/toast";
import { AuthGuard, useAuthContext } from "@/components/auth/AuthGuard";
import { UserProfileProvider } from "@/components/profile/user-profile-provider";
import { BottomNav } from "@/components/home/bottom-nav";

import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";

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
  try {
    session = await getCachedAuthSession();
  } catch (err) {
    console.warn("[AppLayout] Session resolution:", err);
  }

  const initialUser = (session?.user as any) ?? null;

  return (
    <AppColumn>
      <AuthGuard initialSession={session} initialUser={initialUser}>
        <UserProfileProvider initialProfile={initialUser}>
          {children}
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        </UserProfileProvider>
        {/* One stack for the whole signed-in app; every flow raises into it. */}
        <Toaster />
      </AuthGuard>
    </AppColumn>
  );
}

