import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { RecoveryPhraseQuiz } from "@/components/auth/recovery-phrase-quiz";

export const metadata: Metadata = { title: "Confirm seed phrase" };

export default function RecoveryPhraseVerifyPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref="/sign-up/recovery-phrase" />}
      className="[--auth-pb:71px]"
    >
      <AuthHeading title="Backup seed phrase">
        Save these 12 words to recover your account
      </AuthHeading>

      <RecoveryPhraseQuiz nextHref="/sign-up/pin" />
    </AuthScreen>
  );
}
