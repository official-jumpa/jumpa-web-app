import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { RecoveryPhrase } from "@/components/auth/recovery-phrase";

export const metadata: Metadata = { title: "Backup seed phrase" };

export default function RecoveryPhrasePage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref="/sign-up/secure-wallet" />}
      className="[--auth-pb:48px]"
    >
      <AuthHeading title="Backup seed phrase">
        Save these 12 words to recover your account
      </AuthHeading>

      <RecoveryPhrase nextHref="/sign-up/recovery-phrase/verify" />
    </AuthScreen>
  );
}
