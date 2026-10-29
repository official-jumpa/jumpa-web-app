"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Client component that triggers an automatic router replacement to /home
 * after a specified delay (default 5000ms), cleaning up on unmount.
 */
export function AutoRedirectToHome({ delayMs = 5000 }: { delayMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/home");
    }, delayMs);

    return () => clearTimeout(timer);
  }, [router, delayMs]);

  return null;
}
