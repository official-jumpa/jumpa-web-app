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
/** The legal pages widen their gutter on a laptop; the support screens do not. */
const GUTTER = {
  app: "-mx-4.5 px-4.5",
  wide: "-mx-4.5 px-4.5 md:-mx-10 md:px-10",
};

export function SupportHeader({
  children,
  action,
  back = supportHref(),
  gutter = "app",
}: {
  children: ReactNode;
  action?: ReactNode;
  /** Direct-load fallback. Back steps through history when there is any. */
  back?: string;
  /** Has to match the screen's own padding, or the background stops short of it. */
  gutter?: keyof typeof GUTTER;
}) {
  return (
    <header
      className={`sticky top-0 z-20 bg-jumpa-white pt-[calc(env(safe-area-inset-top)+21px)] pb-2 ${GUTTER[gutter]}`}
    >
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
