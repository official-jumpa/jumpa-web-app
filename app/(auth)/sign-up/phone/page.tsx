import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { PhoneForm } from "@/components/auth/phone-form";
import { pageMetadata } from "@/lib/seo";
import { SIGN_UP_FLOW } from "@/lib/sign-up";
import { guardAuthPage } from "@/lib/auth/auth-page-guard";

export const metadata: Metadata = pageMetadata({
  title: "Verify your mobile number",
  description:
    "Add your phone number so Jumpa can send you a verification code and secure your account.",
  path: "/sign-up/phone",
  noIndex: true,
});

interface SignUpPhonePageProps {
  searchParams?: Promise<{ from?: string }>;
}

export default async function SignUpPhonePage({
  searchParams,
}: SignUpPhonePageProps = {}) {
  const resolvedParams = searchParams ? await searchParams : {};
  await guardAuthPage({ step: "phone", searchParams: resolvedParams });

  return (
    <AuthScreen
      header={<AuthHeader backHref={SIGN_UP_FLOW.verifyEmail} />}
      className="[--auth-pb:52px]"
    >
      <div className="flex w-full flex-col gap-6">
        <AuthHeading
          title="Verify your mobile number"
          titleClassName="max-w-92"
        >
          <p className="mt-4">A 6-digit verification code will be sent to the phone number you provided</p>
        </AuthHeading>

        <PhoneForm nextHref={SIGN_UP_FLOW.verifyPhone} />
      </div>
    </AuthScreen>
  );
}
