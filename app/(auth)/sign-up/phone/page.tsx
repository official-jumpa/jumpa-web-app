import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { PhoneForm } from "@/components/auth/phone-form";
import { SIGN_UP_FLOW } from "@/lib/sign-up";

export const metadata: Metadata = { title: "Verify your mobile number" };

export default function SignUpPhonePage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref={SIGN_UP_FLOW.verifyEmail} />}
      className="[--auth-pb:52px]"
    >
      <div className="flex w-full flex-col gap-6">
        <AuthHeading title="Verify your mobile number" titleClassName="max-w-85.5">
          Enter your phone number to receive a verification code.
        </AuthHeading>

        <PhoneForm nextHref={SIGN_UP_FLOW.verifyPhone} />
      </div>
    </AuthScreen>
  );
}
