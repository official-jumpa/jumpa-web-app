"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowBackIcon } from "@/components/ui/icons/arrow-back";
import { CornerUpLeftIcon } from "@/components/ui/icons/corner-up-left";
import { hasInAppHistory } from "@/lib/nav-history";

/**
 * Steps back through history, so a screen reachable from more than one place
 * returns to the one you came from. `href` renders as a real link and is what a
 * direct load — where there is nothing behind this screen — falls back to.
 */
export function BackLink({ href, round }: { href: string; round?: boolean }) {
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
      className="tap flex size-11 items-center justify-center active:scale-90"
    >
      {round ? (
        <span className="flex size-11 items-center justify-center rounded-full bg-jumpa-neutral-50 text-jumpa-primary-950">
          <CornerUpLeftIcon className="size-6" />
        </span>
      ) : (
        <ArrowBackIcon className="size-6 text-jumpa-black" />
      )}
    </Link>
  );
}
