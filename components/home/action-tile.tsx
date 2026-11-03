import Link from "next/link";
import { SOON, SoonTag } from "@/components/ui/soon-tag";
import { cn } from "@/lib/cn";
import type { AppAction } from "./actions";

const TILE = "flex w-11 flex-col items-center gap-1.5";
const LABEL =
  "w-12.25 text-center text-[10px] leading-2.5 font-medium tracking-jumpa-snug text-jumpa-primary-950";

/** One shortcut: a glass disc over its label. Soon tiles are muted and tagged, not hidden. */
export function ActionTile({
  action,
  onSheet,
}: {
  action: AppAction;
  /** Raises Send or Deposit's chooser; tiles that route ignore it. */
  onSheet?: (sheet: "send" | "receive") => void;
}) {
  const { label, Icon, iconSize, to, soon, flip } = action;
  const body = (
    <>
      <span className="glass-jumpa-disc flex size-11 items-center justify-center rounded-full text-jumpa-primary-600">
        <Icon className={cn(iconSize, flip && "-scale-y-100")} />
      </span>
      <span className={LABEL}>{label}</span>
    </>
  );

  if (soon) {
    return (
      <span className="relative">
        <span aria-disabled="true" className={cn(TILE, SOON)}>
          {body}
          <span className="sr-only">(coming soon)</span>
        </span>
        <SoonTag className="-top-1 -right-1.5" />
      </span>
    );
  }

  if ("sheet" in to) {
    return (
      <button
        type="button"
        onClick={() => onSheet?.(to.sheet)}
        aria-haspopup="dialog"
        className={cn("tap active:scale-95", TILE)}
      >
        {body}
      </button>
    );
  }

  return (
    <Link prefetch href={to.href} className={cn("tap active:scale-95", TILE)}>
      {body}
    </Link>
  );
}
