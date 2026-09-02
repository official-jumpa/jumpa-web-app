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
    <span className="flex shrink-0 items-center gap-2 rounded-pill bg-jumpa-secondary-100 px-3 py-1 text-[10px] leading-5 font-medium text-jumpa-primary-950">
      {left}
      <span className="flex size-8.5 items-center justify-center rounded-full border-[0.66px] border-jumpa-black/10 bg-jumpa-primary-525 text-jumpa-alt-400 shadow-[0_0_16px_rgba(0,0,0,0.35)]">
        {media}
      </span>
      {right}
    </span>
  );
}
