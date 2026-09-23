import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Turn on biometrics",
  description:
    "Use Face ID or your fingerprint to unlock Jumpa and approve payments faster.",
  path: "/sign-up/biometrics",
});

export default function BiometricsPage() {
  return (
    <AuthScreen
      header={
        <AuthHeader
          backHref="/sign-up/pin/confirm"
          action={
            <Link
              prefetch
              href="/sign-up/done"
              className="flex h-9 items-center rounded-pill bg-jumpa-primary-50 px-5.5 text-sm leading-4 font-medium text-jumpa-primary-950"
            >
              Skip
            </Link>
          }
        />
      }
      footer={
        <div className="mt-8 flex flex-col gap-2">
          <Button href="/sign-up/done" variant="gradient" size="lg">
            Enable Biometrics
          </Button>
          <Button href="/sign-up/done" variant="softStrong" size="lg">
            i'll do this later
          </Button>
        </div>
      }
      className="relative isolate [--auth-gap:12px] [--auth-pb:26px]"
    >
      {/* Full-bleed backdrop. `fill` + `object-cover` bounds it to this box;
          `width`/`height` would size it from the image and overflow the screen. */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <Image
          src="/images/auth/biometric-stage.webp"
          alt=""
          fill
          priority
          sizes="500px"
          className="object-cover"
        />
      </div>

      <AuthHeading
        title="Turn On Biometric Authentication 🫆"
        className="max-w-84"
      >
        Enable biometric authentication for a seamless and secure login
        experience.
      </AuthHeading>
    </AuthScreen>
  );
}
