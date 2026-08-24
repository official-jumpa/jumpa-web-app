import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/back-link";

/** Back arrow, optional centred title, trailing control. The 44px hit area sets the row height. */
export function ScreenHeader({
  back,
  title,
  action,
}: {
  /** Where a direct load goes back to; in-app the arrow steps back through history. */
  back: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <header className="relative flex h-11 items-center">
      <BackLink href={back} />

      {title ? (
        <h1 className="pointer-events-none absolute inset-x-11 text-center text-base leading-4.5 font-semibold text-jumpa-black">
          {title}
        </h1>
      ) : null}

      <span className="ml-auto flex items-center">{action}</span>
    </header>
  );
}
