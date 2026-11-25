import { cn } from "@/lib/cn";

/** Table discs cycle through these by rank, so 4th is violet, 5th lime and so on. */
const TONES = [
  "bg-jumpa-secondary-150 text-jumpa-primary-950",
  "bg-jumpa-alt-150 text-jumpa-alt-925",
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
        "flex shrink-0 items-center justify-center rounded-full",
        tone,
        className,
      )}
    >
      {initials}
    </span>
  );
}
