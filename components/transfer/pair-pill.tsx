import type { ReactNode } from "react";

/** Lavender capsule with a medallion between two labels — the review summary. */
export function PairPill({
  left,
  right,
  media,
}: {
  left: string;
  right: string;
  media: ReactNode;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-jumpa-primary-50 py-1 pr-3 pl-3 text-[10px] leading-3 font-medium text-jumpa-primary-950">
      {left}
      <span className="flex size-8 items-center justify-center rounded-full bg-jumpa-primary-525 text-jumpa-white">
        {media}
      </span>
      {right}
    </span>
  );
}
