"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";

/** How long the brand mark holds, measured from when the mark is actually on screen. */
const SPLASH_DURATION_MS = 3000;

/**
 * Splash screen, and the only place that decides where a visitor starts.
 *
 * The proxy used to route `/` itself, which meant this never rendered. It now
 * lets `/` through, so the same three outcomes are resolved here instead.
 */
export default function SplashPage() {
  const router = useRouter();
  const [shown, setShown] = useState(false);
  const [next, setNext] = useState<string | null>(null);

  // Runs alongside the hold, so resolving the session costs no extra time.
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const { data: session } = await authClient.getSession();
        if (!active) return;
        if (!session?.user) {
          setNext("/onboarding");
          return;
        }

        const res = await fetch("/api/wallet/list");
        if (!active) return;
        const wallets = await res.json();
        const hasWallet = Array.isArray(wallets) && wallets.length > 0;
        setNext(hasWallet ? "/home" : "/sign-up/pin");
      } catch {
        if (active) setNext("/onboarding");
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (next) router.prefetch(next);
  }, [next, router]);

  // Counting from paint, not from mount: on a fast connection the old timer
  // could elapse while the logo was still decoding, so the splash never showed.
  useEffect(() => {
    if (!shown || !next) return;
    const timer = setTimeout(() => router.replace(next), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [shown, next, router]);

  return (
    <main className="mx-auto flex h-dvh max-w-app items-center justify-center bg-jumpa-primary-600">
      <div className="relative aspect-square w-full max-w-[393px]">
        <Image
          src="/logo/white-logo-text.png"
          alt="Jumpa"
          fill
          priority
          onLoad={() => setShown(true)}
          onError={() => setShown(true)}
          className="object-contain"
          sizes="393px"
        />
      </div>
    </main>
  );
}
