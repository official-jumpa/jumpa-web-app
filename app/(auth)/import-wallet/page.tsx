import type { Metadata } from "next";
import { AuthTitleBar } from "@/components/auth/auth-header";
import { AuthScreen } from "@/components/auth/auth-screen";
import { OptionRow } from "@/components/auth/cards";
import { SocialSignUp } from "@/components/auth/social-sign-up";
import { Button } from "@/components/ui/button";
import { CloudIcon } from "@/components/ui/icons/cloud";
import { UserLockIcon } from "@/components/ui/icons/user-lock";

export const metadata: Metadata = { title: "Import a wallet" };

export default function ImportWalletPage() {
  return (
    <AuthScreen
      header={<AuthTitleBar backHref="/sign-in" title="Import Wallet" />}
      className="[--auth-gap:137px] [--auth-pb:20px]"
    >
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4 text-center text-jumpa-black">
          <h1 className="text-[32px] leading-8.5 font-semibold">
            Import a Wallet
          </h1>
          <p className="max-w-69 text-sm leading-4 font-medium">
            Bring in a wallet you already own — Jumpa never sees what you paste
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <OptionRow
            href="/import-wallet/recovery-phrase"
            icon={<UserLockIcon />}
            title="Recovery Phrase"
            description="Enter your 12 or 24 Word Seed Phrase"
          />
          <OptionRow
            href="/import-wallet/private-key"
            icon={<CloudIcon />}
            title="Private Key"
            description="Enter your Hex or Base64 Private key"
          />
        </div>

        <Button
          href="/import-wallet/recovery-phrase"
          variant="gradient"
          size="lg"
        >
          Continue
        </Button>

        <SocialSignUp />
      </div>
    </AuthScreen>
  );
}
