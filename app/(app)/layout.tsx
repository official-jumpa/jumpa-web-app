import { Suspense } from "react";
import { AppColumn } from "@/components/ui/app-column";
import { Toaster } from "@/components/ui/toast";
import { AuthGuard, useAuthContext } from "@/components/auth/AuthGuard";
import { BottomNav } from "@/components/home/bottom-nav";

export { AuthGuard, useAuthContext };

export const dynamic = "force-dynamic";

/** Signed-in column. Same shell as the auth flow. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppColumn>
      <AuthGuard>
        {children}
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
        {/* One stack for the whole signed-in app; every flow raises into it. */}
        <Toaster />
      </AuthGuard>
    </AppColumn>
  );
}

