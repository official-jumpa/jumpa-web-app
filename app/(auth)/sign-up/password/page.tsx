import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { LoginPasswordForm } from "@/components/auth/login-password-form";
import { SIGN_UP_FLOW } from "@/lib/sign-up";

export const metadata: Metadata = { title: "Set login password" };

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
