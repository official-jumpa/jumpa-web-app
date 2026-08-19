import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowBackIcon } from "@/components/ui/icons/arrow-back";

/** Back arrow, optional centred title, trailing control. The 44px hit area sets the row height. */
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
