import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { LoginPasswordForm } from "@/components/auth/login-password-form";
import { SIGN_UP_FLOW } from "@/lib/sign-up";

export const metadata: Metadata = { title: "Confirm login password" };

export default function ConfirmLoginPasswordPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref={SIGN_UP_FLOW.password} />}
      className="[--auth-pb:11px]"
    >
      <AuthHeading title="Confirm Login Password" className="max-w-84">
        Please enter a 6-digit password. Avoid using simple ones like 123456.
      </AuthHeading>

      <LoginPasswordForm
        label="Re-Enter your login password"
        nextHref={SIGN_UP_FLOW.tag}
        confirm
      />
    </AuthScreen>
  );
}
