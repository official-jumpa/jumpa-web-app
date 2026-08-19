import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { VerifyCodeForm } from "@/components/auth/verify-code-form";

export const metadata: Metadata = { title: "Enter verification code" };

export default function VerifyCodePage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref="/sign-up/verify-email" />}
      className="[--auth-pb:11px]"
    >
      <AuthHeading title="Enter verification code">
        We've sent a 6-digit code to your email. Enter it below to continue.
      </AuthHeading>

      <VerifyCodeForm nextHref="/sign-up/secure-wallet" />
    </AuthScreen>
  );
}
