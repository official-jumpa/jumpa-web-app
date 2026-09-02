import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/back-link";

/**
 * "Back" arrow with the word beside it and an optionally centred title — the
 * header the transfer screens use, where `ScreenHeader`'s bare arrow is used
 * elsewhere.
 */
export function TransferHeader({
  back,
  title,
  action,
}: {
  back: string;
  title?: string;
  /** Trailing slot: the wordmark, a close button, or nothing. */
  action?: ReactNode;
}) {
  return (
    <header className="relative flex h-11 items-center justify-between gap-2">
      <BackLink href={back} variant="corner" label="Back" />

      {title ? (
        <h1 className="pointer-events-none absolute inset-x-24 text-center text-lg leading-4 font-medium text-jumpa-black">
          {title}
        </h1>
      ) : null}

      <span className="flex min-w-9.5 items-center justify-end">{action}</span>
    </header>
  );
}
