import Image from "next/image";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { cn } from "@/lib/cn";

/** One card type on the create screen. Selected rows carry the brand tint. */
export function CardKindRow({
  title,
  blurb,
  selected,
  onSelect,
}: {
  title: string;
  blurb: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "tap flex h-25 w-full items-center gap-2.5 rounded-panel pr-4.5 pl-5.5 text-left active:scale-[0.99]",
        selected
          ? "border border-jumpa-primary-100 bg-jumpa-primary-50"
          : "border border-transparent bg-jumpa-neutral-50",
      )}
    >
      <Image
        src="/images/cards/card-thumb.webp"
        alt=""
        width={129}
        height={249}
        className="h-15.5 w-auto shrink-0"
      />

      <span className="flex min-w-0 flex-1 flex-col gap-2 text-jumpa-black">
        <span className="text-xs leading-3.5 font-medium">{title}</span>
        <span className="text-[10px] leading-3.5">{blurb}</span>
      </span>

      <ChevronRightIcon className="size-6 shrink-0 text-jumpa-black" />
    </button>
  );
}
