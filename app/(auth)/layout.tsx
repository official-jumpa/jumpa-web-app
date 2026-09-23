import type { Metadata } from "next";
import { AppColumn } from "@/components/ui/app-column";
import { AuthStepGuard } from "@/components/auth/auth-step-guard";

/**
 * Auth steps have nothing to rank and would answer the brand query with a form.
 * Crawlable on purpose — Google has to fetch a page to read its `noindex`.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

/** Light column for the sign-up flow. Same shell as the signed-in app. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <AppColumn>
      <AuthStepGuard>{children}</AuthStepGuard>
    </AppColumn>
  );
}
