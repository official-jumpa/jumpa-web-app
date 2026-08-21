import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { PinForm } from "@/components/auth/pin-form";

export const metadata: Metadata = { title: "Set transaction PIN" };

export default function SetPinPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref="/import-wallet" />}
      className="[--auth-pb:11px]"
    >
      <AuthHeading title="Set transaction PIN">
        6-digit code to authorize payments
      </AuthHeading>

      <PinForm label="Enter your pin" nextHref="/sign-up/pin/confirm" />
    </AuthScreen>
  );
}
