import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { PhoneCodeForm } from "@/components/auth/phone-code-form";
import { SIGN_UP_FLOW } from "@/lib/sign-up";

export const metadata: Metadata = { title: "Verify your mobile number" };

export default function VerifyPhonePage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref={SIGN_UP_FLOW.phone} />}
      className="[--auth-pb:11px]"
    >
      <AuthHeading title="Verify your mobile number" titleClassName="max-w-85.5">
        Enter the 6-digit code sent to your mobile number.
      </AuthHeading>

      <PhoneCodeForm nextHref={SIGN_UP_FLOW.password} />
    </AuthScreen>
  );
}
