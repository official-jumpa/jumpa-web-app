import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { ConfirmPinForm } from "@/components/auth/confirm-pin-form";
import { SIGN_UP_FLOW } from "@/lib/sign-up";

export const metadata: Metadata = { title: "Confirm PIN" };

export default function ConfirmPinPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref={SIGN_UP_FLOW.pin} />}
      className="[--auth-pb:11px]"
    >
      <AuthHeading title="Confirm PIN">
        6-digit code to authorize payments
      </AuthHeading>

      <ConfirmPinForm nextHref={SIGN_UP_FLOW.done} />
    </AuthScreen>
  );
}
