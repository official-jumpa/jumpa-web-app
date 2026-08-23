import Link from "next/link";
import type { ReactNode } from "react";
import { CornerUpLeftIcon } from "@/components/ui/icons/corner-up-left";

/** Circular back control with a centred title and an optional trailing control. */
export function SettingsHeader({
  back,
  title,
  action,
}: {
  back: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="relative flex h-11 items-center justify-between">
      <Link
        href={back}
        aria-label="Go back"
        className="flex size-11 items-center justify-center rounded-pill bg-jumpa-neutral-50 text-jumpa-primary-950 tap active:scale-95"
      >
        <CornerUpLeftIcon className="size-6" />
      </Link>

      <h1 className="pointer-events-none absolute inset-x-11 text-center text-base leading-4.5 font-medium text-jumpa-black">
        {title}
      </h1>

      {action ?? <span className="size-11" />}
    </header>
  );
}
