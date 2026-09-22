import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { PrivateKeyForm } from "@/components/auth/private-key-form";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Import private key",
  description:
    "Restore access to your wallet in Jumpa by importing its private key.",
  path: "/import-wallet/private-key",
});

export default function ImportPrivateKeyPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref="/import-wallet" />}
      className="[--auth-pb:45px]"
    >
      <AuthHeading title="Import Private Key 🗝️" className="max-w-84">
        Enter your private key to securely access to your wallet
      </AuthHeading>

      <PrivateKeyForm nextHref="/sign-up/pin" />
    </AuthScreen>
  );
}
