import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { LoginPasswordForm } from "@/components/auth/login-password-form";
import { pageMetadata } from "@/lib/seo";
import { SIGN_UP_FLOW } from "@/lib/sign-up";

export const metadata: Metadata = pageMetadata({
  title: "Set login password",
  description: "Choose the 6-digit password you'll use to sign in to Jumpa.",
  path: "/sign-up/password",
});

export default function SetLoginPasswordPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref={SIGN_UP_FLOW.verifyPhone} />}
      className="[--auth-pb:11px]"
    >
      <AuthHeading title="Set Login Password" className="max-w-84">
        Please enter a 6-digit password. Avoid using simple ones like 123456.
      </AuthHeading>

      <LoginPasswordForm
        label="Enter your login password"
        nextHref={SIGN_UP_FLOW.confirmPassword}
      />
    </AuthScreen>
  );
}
