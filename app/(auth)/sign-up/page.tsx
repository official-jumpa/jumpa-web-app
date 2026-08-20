import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { InsetCard } from "@/components/auth/cards";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { SocialSignUp } from "@/components/auth/social-sign-up";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";

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

      <div className="mt-7.25 flex flex-col gap-8.5">
        <InsetCard>
          <span className="flex items-center gap-2">
            <ShieldCheckIcon className="size-6 shrink-0 text-jumpa-primary-600" />
            <span className="flex flex-col gap-1 text-jumpa-black">
              <span className="text-xs leading-3.5 font-medium">
                Make use of recovery phrase
              </span>
              <span className="text-[10px] leading-3.5">
                Generate a 12 -24 word recovery phrase
              </span>
            </span>
          </span>
          <ChevronRightIcon className="size-5 shrink-0 text-jumpa-black" />
        </InsetCard>

        <p className="mx-auto max-w-58 text-center text-xs leading-3 text-jumpa-danger">
          Every method is self custodial, Jumpa never hold your keys
        </p>
      </div>
    </AuthScreen>
  );
}
