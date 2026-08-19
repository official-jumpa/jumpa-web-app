"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** How long the brand mark holds before the onboarding carousel takes over. */
const SPLASH_DURATION_MS = 1800;

/**
 * Splash screen. Once session state exists this should branch — returning users
 * into the app, first-time users on to onboarding.
 */
export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/onboarding");
    const timer = setTimeout(
      () => router.replace("/onboarding"),
      SPLASH_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="mx-auto flex h-dvh max-w-[430px] items-center justify-center bg-jumpa-primary-600">
      <div className="relative aspect-square w-full max-w-[393px]">
        <Image
          src="/logo/white-logo-text.png"
          alt="Jumpa"
          fill
          priority
          className="object-contain"
          sizes="393px"
        />
      </div>
    </main>
  );
}
