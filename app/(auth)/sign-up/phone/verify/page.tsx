import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { PhoneCodeForm } from "@/components/auth/phone-code-form";
import { pageMetadata } from "@/lib/seo";
import { SIGN_UP_FLOW } from "@/lib/sign-up";
import { guardAuthPage } from "@/lib/auth/auth-page-guard";

export const metadata: Metadata = pageMetadata({
  title: "Confirm your mobile number",
  description:
    "Enter the 6-digit code sent to your phone to finish verifying your Jumpa account.",
  path: "/sign-up/phone/verify",
  noIndex: true,
});

export default async function VerifyPhonePage() {
  await guardAuthPage({ step: "phone-verify" });

  return (
    <AuthScreen
      header={<AuthHeader backHref={SIGN_UP_FLOW.phone} />}
      className="[--auth-pb:11px]"
    >
      <AuthHeading
        title="Verify your mobile number"
        titleClassName="max-w-85.5"
      >
        Enter the 6-digit code sent to your mobile number.
      </AuthHeading>

      <PhoneCodeForm nextHref={SIGN_UP_FLOW.password} />
    </AuthScreen>
  );
}
