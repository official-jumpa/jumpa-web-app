import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { PinForm } from "@/components/auth/pin-form";
import { SIGN_UP_FLOW } from "@/lib/sign-up";

export const metadata: Metadata = { title: "Set transaction PIN" };

export default function SetPinPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref={SIGN_UP_FLOW.tag} />}
      className="[--auth-pb:11px]"
    >
      <AuthHeading title="Set transaction PIN">
        4-digit code to authorize payments
      </AuthHeading>

      <PinForm label="Enter your pin" nextHref={SIGN_UP_FLOW.confirmPin} />
    </AuthScreen>
  );
}
