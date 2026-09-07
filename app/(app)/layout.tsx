import { AppColumn } from "@/components/ui/app-column";
import { AuthGuard, useAuthContext } from "@/components/auth/AuthGuard";

export { AuthGuard, useAuthContext };

/** Signed-in column. Same shell as the auth flow. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppColumn>
      <AuthGuard>{children}</AuthGuard>
    </AppColumn>
  );
}

