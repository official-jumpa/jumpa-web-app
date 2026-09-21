import type { Metadata } from "next";
import { Suspense } from "react";
import { AppColumn } from "@/components/ui/app-column";
import { Toaster } from "@/components/ui/toast";
import { AuthGuard, useAuthContext } from "@/components/auth/AuthGuard";
import { UserProfileProvider } from "@/components/profile/user-profile-provider";
import { BottomNav } from "@/components/home/bottom-nav";

export { AuthGuard, useAuthContext };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};
/** Signed-in column. Same shell as the auth flow. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppColumn>
      <AuthGuard>
        <UserProfileProvider>
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

