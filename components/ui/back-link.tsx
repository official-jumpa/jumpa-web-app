"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowBackIcon } from "@/components/ui/icons/arrow-back";
import { hasInAppHistory } from "@/lib/nav-history";

/**
 * Steps back through history, so a screen reachable from more than one place
 * returns to the one you came from. `href` renders as a real link and is what a
 * direct load — where there is nothing behind this screen — falls back to.
 */
export function BackLink({ href }: { href: string }) {
  const router = useRouter();

  return (
    <Link
      href={href}
      aria-label="Go back"
      onClick={(event) => {
        if (!hasInAppHistory()) return;
        event.preventDefault();
        router.back();
      }}
      className="flex size-11 items-center justify-center text-jumpa-black tap active:scale-90"
    >
      <ArrowBackIcon className="size-6" />
    </Link>
  );
}
