import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/back-link";
import { supportHref } from "@/lib/support";

/**
 * Bare corner arrow with the screen's own centre block. The support and legal
 * screens draw this rather than the app's round settings header.
 *
 * It sticks to the top and owns the screen's top padding — both screens run
 * long, and Back has to stay reachable without scrolling back up for it. The
 * negative margin lets its background cover the column's gutters.
 */
export function SupportHeader({
  children,
  action,
  back = supportHref(),
}: {
  children: ReactNode;
  action?: ReactNode;
  /** Direct-load fallback. Back steps through history when there is any. */
  back?: string;
}) {
  return (
    <header className="sticky top-0 z-20 -mx-4.5 bg-jumpa-white px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-2">
      <div className="relative flex h-11 items-center justify-between">
        <BackLink href={back} variant="corner" />

        <div className="pointer-events-none absolute inset-x-14 flex items-center justify-center">
          {children}
        </div>

        {action ?? <span className="size-11" />}
      </div>
    </header>
  );
}
