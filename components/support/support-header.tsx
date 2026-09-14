import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/back-link";
import { supportHref } from "@/lib/support";

/**
 * Bare corner arrow with the screen's own centre block. Both support screens
 * draw this rather than the app's round settings header.
 */
export function SupportHeader({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="relative flex h-11 items-center justify-between">
      <BackLink href={supportHref()} variant="corner" />

      <div className="pointer-events-none absolute inset-x-14 flex items-center justify-center">
        {children}
      </div>

      {action ?? <span className="size-11" />}
    </header>
  );
}
