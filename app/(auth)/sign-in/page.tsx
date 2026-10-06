import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { SocialSignUp } from "@/components/auth/social-sign-up";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sign in",
  description:
    "Sign in to your Jumpa wallet. Access your balances, send money, and manage your crypto, all in one place.",
  path: "/sign-in",
});

export default function SignInPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref="/onboarding" />}
      className="[--auth-gap:24px] [--auth-pb:42px]"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex w-full flex-col gap-6">
          <AuthHeading
            title="Great seeing you again!"
            className="max-w-84"
            titleClassName="max-w-98.5"
          >
            Sign in with your email to continue from where you left off.
          </AuthHeading>

          <Suspense fallback={<div className="h-28 w-full animate-pulse rounded-card bg-jumpa-neutral-50" />}>
            <EmailAuthForm nextHref="/sign-up/verify-code" />
          </Suspense>
        </div>

        <SocialSignUp label="Or Sign in With" />

        <p className="text-xs font-semibold text-jumpa-black">
          Don't have an account?{" "}
          <Link prefetch href="/sign-up" className="text-jumpa-primary-600">
            Sign Up
          </Link>
        </p>
      </div>
    </AuthScreen>
  );
}
