import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { InsetCard } from "@/components/auth/cards";
import { SocialSignUp } from "@/components/auth/social-sign-up";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { MailIcon } from "@/components/ui/icons/mail";
import { WalletArrowRightIcon } from "@/components/ui/icons/wallet-arrow-right";
import { TextField } from "@/components/ui/text-field";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref="/onboarding" />}
      footer={
        <div className="mt-8 flex flex-col gap-3.25">
          <Link href="/import-wallet">
            <InsetCard>
              <span className="flex items-center gap-2">
                <WalletArrowRightIcon className="size-6 shrink-0 text-jumpa-primary-600" />
                <span className="flex flex-col gap-1 text-jumpa-black">
                  <span className="text-xs leading-3.5 font-medium">
                    Import your wallet
                  </span>
                  <span className="text-[10px] leading-3.5">
                    Recovery phrase or private key
                  </span>
                </span>
              </span>
              <ChevronRightIcon className="size-5 shrink-0 text-jumpa-black" />
            </InsetCard>
          </Link>

          <p className="mx-auto max-w-58 text-center text-xs leading-3 text-jumpa-danger">
            Every method is self custodial, Jumpa never hold your keys
          </p>
        </div>
      }
      className="[--auth-gap:24px] [--auth-pb:42px]"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex w-full flex-col gap-6">
          <div className="flex flex-col gap-8">
            <AuthHeading
              title="Great seeing you again! 👋"
              className="max-w-84"
              titleClassName="max-w-58.5"
            >
              Sign in with your email and password to continue where you left
              off.
            </AuthHeading>

            <TextField
              label="Enter your Email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              icon={<MailIcon />}
            />
          </div>

          <Button variant="gradient" size="lg">
            Continue
          </Button>
        </div>

        <SocialSignUp label="Or Sign in With" />

        <p className="text-xs font-semibold text-jumpa-black">
          Don't have an account?{" "}
          <Link href="/sign-up" className="text-jumpa-primary-600">
            Sign Up
          </Link>
        </p>
      </div>
    </AuthScreen>
  );
}
