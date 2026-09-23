"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * Silently sends a signed-in visitor on to their app destination. Renders
 * nothing and never redirects an anonymous visitor — they simply see the
 * landing page. Mirrors the wallet-setup resolution the old splash screen
 * (`app/page.tsx`, before this file replaced it) used to run.
 */
export function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const { data: session } = await authClient.getSession();
        if (!active || !session?.user) return;

        const res = await fetch("/api/auth/wallet-setup");
        if (!active) return;
        if (!res.ok) {
          router.replace("/home");
          return;
        }

        const status = await res.json();
        if (status.nextRoute) {
          router.replace(status.nextRoute);
        } else if (!status.hasPhone) {
          router.replace("/sign-up/phone");
        } else if (!status.hasPassword) {
          router.replace("/sign-up/password");
        } else if (!status.hasTag) {
          router.replace("/sign-up/tag");
        } else if (!status.hasPin) {
          router.replace("/sign-up/pin");
        } else if (status.needsPinMigration) {
          router.replace("/migrate-pin");
        } else {
          router.replace("/home");
        }
      } catch {
        // Anonymous visitor or a network hiccup — stay on the landing page.
      }
    }

    checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  return null;
}
