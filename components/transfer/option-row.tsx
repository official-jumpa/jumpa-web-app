import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { SOON, SoonTag } from "@/components/ui/soon-tag";
import { cn } from "@/lib/cn";

/** Icon tile, title and caption — the row shape shared by every chooser here. */
export function OptionRow({
  Icon,
  media,
  title,
  caption,
  onClick,
  href,
  soon,
}: {
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Anything that replaces the purple tile — an avatar, a bank mark. */
  media?: ReactNode;
  title: string;
  caption: ReactNode;
  onClick?: () => void;
  href?: string;
  /** Muted and inert, with a Soon tag on the tile, for a way that isn't live yet. */
  soon?: boolean;
}) {
  const body = (
    <>
      {media ?? (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-panel bg-jumpa-primary-600 text-jumpa-white">
          {Icon ? <Icon className="size-5" /> : null}
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-0.5 text-left">
        <span className="truncate text-sm leading-4 font-semibold text-jumpa-black">
          {title}
        </span>
        <span className="truncate text-xs leading-3 font-medium text-jumpa-neutral-400">
          {caption}
        </span>
      </span>
    </>
  );

  const className = "tap flex w-full items-center gap-4 active:scale-[0.99]";

  if (soon) {
    return (
      <span className="relative flex">
        <span
          aria-disabled="true"
          className={cn("flex w-full items-center gap-4", SOON)}
        >
          {body}
          <span className="sr-only">(coming soon)</span>
        </span>
        <SoonTag className="-top-1 left-7.5" />
      </span>
    );
  }

  if (href) {
    return (
      <Link prefetch href={href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}
