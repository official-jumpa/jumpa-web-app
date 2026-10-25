import type { Metadata } from "next";
import { ForgotPasswordView } from "@/components/auth/forgot-password-view";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { pageMetadata } from "@/lib/seo";

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Forgot password",
  description: "Reset your Jumpa wallet login password",
  path: "/forgot-password",
  noIndex: true,
});

export default async function ForgotPasswordPage() {
  const session = await getCachedAuthSession();

  // If there is no active session, user cannot reset in-app lock password; they must sign in with email OTP first
  if (!session?.user?.id || !session?.user?.email) {
    redirect("/sign-in");
  }

  return <ForgotPasswordView initialEmail={session.user.email} isEmailLocked={true} />;
}
