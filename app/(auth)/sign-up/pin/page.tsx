import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { PinForm } from "@/components/auth/pin-form";
import { pageMetadata } from "@/lib/seo";
import { SIGN_UP_FLOW } from "@/lib/sign-up";
import { guardAuthPage } from "@/lib/auth/auth-page-guard";

export const metadata: Metadata = pageMetadata({
  title: "Set transaction PIN",
  description:
    "Create the 4-digit PIN you'll use to authorise payments from your Jumpa wallet.",
  path: "/sign-up/pin",
  noIndex: true,
});

export default async function SetPinPage() {
  await guardAuthPage({ step: "pin" });

  return (
    <AuthScreen
      header={<AuthHeader backHref={SIGN_UP_FLOW.confirmPassword} />}
      className="[--auth-pb:11px]"
    >
      <AuthHeading title="Set transaction PIN">
        4-digit code to authorize payments
      </AuthHeading>

      <PinForm label="Enter your pin" nextHref={SIGN_UP_FLOW.confirmPin} />
    </AuthScreen>
  );
}
