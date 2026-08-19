import type { Metadata } from "next";
import Image from "next/image";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthScreen } from "@/components/auth/auth-screen";
import { InsetCard } from "@/components/auth/cards";
import { CopyButton } from "@/components/auth/copy-button";
import { Button } from "@/components/ui/button";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";

/** Placeholder until the wallet layer exists. */
const WALLET_ADDRESS = "227gbwdyu3e837e2y329ehd";

export const metadata: Metadata = { title: "You're all set" };

export default function SignUpDonePage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref="/sign-up/pin/confirm" />}
      className="[--auth-pb:67px]"
      footer={
        <Button href="/" variant="gradient" size="lg" className="mt-8">
          Go to Home
        </Button>
      }
    >
      <div className="flex flex-1 flex-col items-center">
        {/* The export carries 85px of transparent glow below the badge. */}
        <Image
          src="/images/auth/verified-badge.svg"
          alt=""
          width={219}
          height={276}
          priority
          className="mt-6 -mb-21.25"
        />

        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-[28px] leading-8.5 font-semibold text-jumpa-black">
            Thanks, Bharry! You're All Set
          </h1>
          <p className="max-w-73.5 text-sm leading-4.5 text-jumpa-neutral-800">
            Your account has been securely verified. You're ready to manage your
            portfolio and explore the crypto market.
          </p>
        </div>

        <InsetCard className="mt-9">
          <span className="flex items-center gap-2">
            <ShieldCheckIcon className="size-6 shrink-0 text-jumpa-primary-600" />
            <span className="flex flex-col gap-1 text-jumpa-black">
              <span className="text-sm leading-4">Your Wallet Address</span>
              <span className="text-sm leading-4">{WALLET_ADDRESS}</span>
            </span>
          </span>
          <CopyButton value={WALLET_ADDRESS} />
        </InsetCard>
      </div>
    </AuthScreen>
  );
}
