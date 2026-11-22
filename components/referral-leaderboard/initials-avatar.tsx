import { cn } from "@/lib/cn";

/** Table discs cycle through these by rank. */
const TONES = [
  "bg-jumpa-primary-100 text-jumpa-primary-600",
  "bg-jumpa-alt-100 text-jumpa-alt-900",
  "bg-jumpa-peach-100 text-jumpa-peach-700",
  "bg-jumpa-sky-100 text-jumpa-sky-700",
] as const;

export function toneForRank(rank: number): string {
  return TONES[rank % TONES.length];
}

/** Initials in a disc; size and type come from `className`, colours from `tone`. */
export function InitialsAvatar({
  initials,
  tone,
  className,
}: {
  initials: string;
  tone: string;
  className: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        tone,
        className,
      )}
    >
      {initials}
    </span>
  );
}
