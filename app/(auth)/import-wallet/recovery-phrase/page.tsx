import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { PhraseImport } from "@/components/auth/phrase-import";

export const metadata: Metadata = { title: "Enter your recovery phrase" };

export default function ImportRecoveryPhrasePage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref="/import-wallet" />}
      className="[--auth-pb:45px]"
    >
      <AuthHeading title="Enter Your Recovery Phrase 🔐" className="max-w-84">
        Enter your 12 or 24-word recovery phrase to securely regain access to
        your wallet.
      </AuthHeading>

      <PhraseImport nextHref="/sign-up/pin" />
    </AuthScreen>
  );
}
