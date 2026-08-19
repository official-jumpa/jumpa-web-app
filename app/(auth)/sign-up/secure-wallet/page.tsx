import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuthTitleBar } from "@/components/auth/auth-header";
import { AuthScreen } from "@/components/auth/auth-screen";
import { OptionRow } from "@/components/auth/cards";
import { InfoNote } from "@/components/auth/info-note";
import { RingedButton } from "@/components/auth/ringed-button";
import { CloudIcon } from "@/components/ui/icons/cloud";
import { UserLockIcon } from "@/components/ui/icons/user-lock";

export const metadata: Metadata = { title: "Secure your wallet" };

export default function SecureWalletPage() {
  return (
    <AuthScreen
      header={
        <AuthTitleBar backHref="/sign-up/verify-code" title="Secure Wallet" />
      }
      footer={
        <div className="mt-8 flex flex-col items-center gap-4">
          <RingedButton href="/sign-up/recovery-phrase">
            Backup Now
          </RingedButton>
          <Link
            href="/sign-up/pin"
            className="text-base leading-4 font-bold text-jumpa-primary-950"
          >
            Remind me later
          </Link>
        </div>
      }
      className="[--auth-gap:24px] [--auth-pb:66px]"
    >
      <div className="flex flex-col items-center gap-8">
        <Image
          src="/images/auth/secure-wallet-lock.svg"
          alt=""
          width={106}
          height={150}
          priority
        />

        <div className="flex flex-col items-center gap-4 text-center text-jumpa-black">
          <h1 className="text-[32px] leading-8.5 font-semibold">
            Secure your Wallet
          </h1>
          <p className="max-w-69 text-sm leading-4 font-medium">
            Your recovery phrase is the key to restoring your wallet. Keep it
            somewhere safe and never share it with anyone.
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-6">
          <div className="flex w-full flex-col gap-2">
            <OptionRow
              href="/sign-up/recovery-phrase"
              icon={<UserLockIcon />}
              title="Back up now"
              description="Reveal and save your 12 Word Phrase"
            />
            <OptionRow
              href="/sign-up/recovery-phrase"
              icon={<CloudIcon />}
              title="Back up to Icloud"
              description="Encrypted with your PIN, Stored in your account"
            />
          </div>

          <InfoNote tone="danger" className="max-w-74.75">
            Jumpa can't recover this for you, anyone with the PIN controls the
            account
          </InfoNote>
        </div>
      </div>
    </AuthScreen>
  );
}
