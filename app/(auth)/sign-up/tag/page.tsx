import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { JumpaTagForm } from "@/components/auth/jumpa-tag-form";
import { SIGN_UP_FLOW } from "@/lib/sign-up";

export const metadata: Metadata = { title: "Pick your Jumpa Tag" };

export default function JumpaTagPage() {
  return (
    <AuthScreen
      header={<AuthHeader backHref={SIGN_UP_FLOW.confirmPassword} />}
      className="[--auth-pb:52px]"
    >
      <div className="flex flex-1 flex-col gap-6">
        <AuthHeading title="Pick your Jumpa Tag" className="max-w-84">
          Your tag is your unique identity on Jumpa. People can use it to find
          and pay you.
        </AuthHeading>

        <JumpaTagForm nextHref={SIGN_UP_FLOW.pin} />
      </div>
    </AuthScreen>
  );
}
