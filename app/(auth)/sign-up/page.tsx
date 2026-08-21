import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { SocialSignUp } from "@/components/auth/social-sign-up";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref="/onboarding" />}
      className="[--auth-pb:52px]"
    >
      <div className="flex flex-col items-center gap-8">
        <div className="flex w-full flex-col gap-6">
          <AuthHeading title="Create account 👋">
            Get started with Jumpa in minutes
          </AuthHeading>

          <EmailAuthForm nextHref="/sign-up/verify-code" />
        </div>

        <SocialSignUp />

        <p className="text-xs font-semibold text-jumpa-black">
          Have an account?{" "}
          <Link href="/sign-in" className="text-jumpa-primary-600">
            Sign In
          </Link>
        </p>
      </div>
    </AuthScreen>
  );
}
