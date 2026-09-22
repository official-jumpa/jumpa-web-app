import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { VerifyCodeForm } from "@/components/auth/verify-code-form";
import { pageMetadata } from "@/lib/seo";
import { SIGN_UP_FLOW } from "@/lib/sign-up";

export const metadata: Metadata = pageMetadata({
  title: "Enter verification code",
  description:
    "Enter the 6-digit code we emailed you to verify your Jumpa account.",
  path: "/sign-up/verify-code",
});

export default function VerifyCodePage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref={SIGN_UP_FLOW.email} />}
      className="[--auth-pb:11px]"
    >
      <AuthHeading title="Enter verification code">
        We've sent a 6-digit code to your email. Enter it below to continue.
      </AuthHeading>

      <VerifyCodeForm nextHref={SIGN_UP_FLOW.phone} />
    </AuthScreen>
  );
}
