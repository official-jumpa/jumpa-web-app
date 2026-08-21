import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** One cell of a recovery-phrase grid. */
export function WordChip({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex h-11 min-w-0 items-center justify-center overflow-hidden rounded-chip bg-jumpa-neutral-50 px-1.5 text-sm leading-4 font-medium text-jumpa-black",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Four-column phrase grid. */
export function WordGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid w-full grid-cols-4 gap-x-2 gap-y-6">{children}</div>
  );
}
