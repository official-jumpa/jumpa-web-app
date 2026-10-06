import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { SocialSignUp } from "@/components/auth/social-sign-up";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Create account",
  description:
    "Create your free Jumpa account. Set up a self-custodial wallet in minutes and start moving money across currencies and chains.",
  path: "/sign-up",
});

export default function SignUpPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref="/onboarding" />}
      className="[--auth-pb:52px]"
    >
      <div className="flex flex-col items-center gap-8">
        <div className="flex w-full flex-col gap-6">
          <AuthHeading title="Create account">
            Get started with Jumpa in minutes
          </AuthHeading>

          <Suspense fallback={<div className="h-28 w-full animate-pulse rounded-card bg-jumpa-neutral-50" />}>
            <EmailAuthForm nextHref="/sign-up/verify-code" showReferralField />
          </Suspense>
        </div>

        <SocialSignUp />

        <p className="text-xs font-semibold text-jumpa-black">
          Have an account?{" "}
          <Link prefetch href="/sign-in" className="text-jumpa-primary-600">
            Sign In
          </Link>
        </p>
      </div>
    </AuthScreen>
  );
}
