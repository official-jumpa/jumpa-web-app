"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { recordVisit } from "@/lib/nav-history";

/**
 * The centred column every screen sits in, plus the fade between screens. Keying
 * on the path is what restarts that fade — a layout does not remount when you
 * move between its own routes.
 *
 * The transition is opacity only, deliberately: a transform here would become the
 * containing block for every `fixed` overlay under it — nav, sheets, backdrops —
 * and shift them while it ran.
 *
 * `children` stays a server-rendered subtree; only this wrapper is a client
 * component, so no page is pulled into the client bundle by it.
 */
export function AppColumn({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Every screen passes through here, so this is where a back arrow learns
  // whether there is an in-app screen behind it.
  useEffect(() => recordVisit(pathname), [pathname]);

  return (
    <div
      key={pathname}
      className="mx-auto min-h-dvh w-full max-w-app animate-fade bg-jumpa-white"
    >
      {children}
    </div>
  );
}
