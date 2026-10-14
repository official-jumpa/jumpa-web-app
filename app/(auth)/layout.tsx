import type { Metadata } from "next";
import { AppColumn } from "@/components/ui/app-column";
import { AuthStepGuard } from "@/components/auth/auth-step-guard";

/** Light column for the auth flows. Same shell as the signed-in app. */

/** Light column for the sign-up flow. Same shell as the signed-in app. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppColumn>
      <AuthStepGuard>{children}</AuthStepGuard>
    </AppColumn>
  );
}
