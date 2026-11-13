import type { ComponentType, SVGProps } from "react";
import { CheckBoldIcon } from "@/components/ui/icons/check-bold";
import { SOON, SoonTag } from "@/components/ui/soon-tag";
import { cn } from "@/lib/cn";
import { IconTile } from "./icon-tile";

/** The two option cards drawn: a rhythm, and the slimmer funding source. */
const LOOK = {
  rhythm: {
    card: "min-h-23 rounded-row p-4",
    tile: "lg",
    idleTile: "plain",
    icon: "size-6",
    text: "gap-1",
    soonTag: "top-2.5 left-13",
  },
  source: {
    card: "h-17.25 rounded-surface pr-4 pl-3",
    tile: "md",
    idleTile: "soft",
    icon: "size-5.5",
    text: "gap-0.75",
    soonTag: "top-1.5 left-10.5",
  },
} as const;

const CARD = "flex w-full items-center gap-3.5 text-left";
const PICKED = "bg-jumpa-primary-50 inset-ring-2 inset-ring-jumpa-primary-600";
const IDLE = "bg-jumpa-white inset-ring-[1.5px] inset-ring-jumpa-grey-150";

/** One option in a pick-one list: icon tile, title, caption and a radio mark. */
export function ChoiceCard({
  look,
  icon: Icon,
  title,
  caption,
  selected,
  soon,
  onSelect,
}: {
  look: keyof typeof LOOK;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  caption: string;
  selected: boolean;
  /** Muted and inert, with a Soon tag on the tile, for a choice that isn't live yet. */
  soon?: boolean;
  onSelect: () => void;
}) {
  const style = LOOK[look];

  const body = (
    <>
      <IconTile size={style.tile} tone={selected ? "solid" : style.idleTile}>
        <Icon className={style.icon} />
      </IconTile>
      <span className={cn("flex min-w-0 flex-1 flex-col", style.text)}>
        <span className="text-base leading-5 font-semibold tracking-jumpa-snug text-jumpa-grey-950">
          {title}
        </span>
        <span className="text-xs leading-3.5 tracking-jumpa-snug text-jumpa-grey-500">
          {caption}
        </span>
      </span>
      <RadioMark checked={selected} />
    </>
  );

  if (soon) {
    return (
      <span className="relative flex">
        <span aria-disabled="true" className={cn(CARD, style.card, IDLE, SOON)}>
          {body}
          <span className="sr-only">(coming soon)</span>
        </span>
        <SoonTag className={style.soonTag} />
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "tap active:scale-[0.99]",
        CARD,
        style.card,
        selected ? PICKED : IDLE,
      )}
    >
      {body}
    </button>
  );
}

function RadioMark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full",
        checked
          ? "bg-jumpa-primary-600 text-jumpa-white"
          : "bg-jumpa-white inset-ring-[1.5px] inset-ring-jumpa-grey-200",
      )}
    >
      {checked ? <CheckBoldIcon className="size-3.5" /> : null}
    </span>
  );
}
