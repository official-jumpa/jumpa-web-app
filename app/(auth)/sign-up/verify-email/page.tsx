import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref="/sign-up/password" />}
      className="[--auth-pb:35px]"
      footer={
        <div className="mt-8 flex flex-col gap-6">
          <Button href="/sign-up/verify-code" variant="gradient" size="lg">
            Continue
          </Button>
          <div className="flex flex-col gap-3 text-xs leading-3.5 font-medium text-jumpa-neutral-500">
            <p>Didn't receive it?</p>
            <p className="text-jumpa-neutral-500/50">
              Check spam folder or wait a moment before requesting a new link.
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        <AuthHeading title="Verify email">
          Check your inbox for a verification link
        </AuthHeading>

        <p className="rounded-tile border border-jumpa-primary-100 bg-jumpa-primary-50 px-5.25 py-6 text-base leading-4.5 font-medium text-jumpa-primary-950">
          We've sent a verification link to your email address.
        </p>
      </div>
    </AuthScreen>
  );
}
