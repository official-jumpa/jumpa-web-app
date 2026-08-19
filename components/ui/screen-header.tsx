import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowBackIcon } from "@/components/ui/icons/arrow-back";

/**
 * Back arrow with an optional centred title and trailing control. The arrow sits
 * in a 44px hit area, so the row height matches the design without extra padding.
 */
export function ScreenHeader({
  back,
  title,
  action,
}: {
  back: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <header className="relative flex h-11 items-center">
      <Link
        href={back}
        aria-label="Go back"
        className="flex size-11 items-center justify-center text-jumpa-black"
      >
        <ArrowBackIcon className="size-6" />
      </Link>

      {title ? (
        <h1 className="pointer-events-none absolute inset-x-11 text-center text-base leading-4.5 font-semibold text-jumpa-black">
          {title}
        </h1>
      ) : null}

      <span className="ml-auto flex items-center">{action}</span>
    </header>
  );
}
