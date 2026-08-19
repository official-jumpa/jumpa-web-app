import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";
import { MailIcon } from "@/components/ui/icons/mail";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";

export const metadata: Metadata = { title: "Choose a password" };

export default function SignUpPasswordPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref="/sign-up" />}
      className="[--auth-pb:27px]"
      footer={
        <p className="mt-8 text-center text-xs font-semibold text-jumpa-black">
          Have an account?{" "}
          <Link href="/sign-in" className="text-jumpa-primary-600">
            Sign In
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-8">
        <AuthHeading title="Create account 👋">
          Get started with Jumpa in minutes
        </AuthHeading>

        <div className="flex flex-col gap-4">
          <TextField
            label="Enter your Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            icon={<MailIcon />}
          />
          <PasswordField
            label="Enter your Password"
            name="password"
            autoComplete="new-password"
            placeholder="••••••••"
          />
          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </div>
      </div>

      <Button
        href="/sign-up/verify-email"
        variant="gradient"
        size="lg"
        className="mt-8"
      >
        Continue
      </Button>

      <div className="mt-8 flex flex-col gap-3 text-xs leading-3.5 font-medium text-jumpa-neutral-500">
        <p>Tip:</p>
        <p className="text-jumpa-neutral-500/50">
          Use a strong password with letters, numbers, and symbols. This is for
          your account security only.
        </p>
      </div>
    </AuthScreen>
  );
}
