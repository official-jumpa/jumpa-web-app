import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";

/** Icon tile, title and caption — the row shape shared by every chooser here. */
export function OptionRow({
  Icon,
  media,
  title,
  caption,
  onClick,
  href,
}: {
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Anything that replaces the purple tile — an avatar, a bank mark. */
  media?: ReactNode;
  title: string;
  caption: ReactNode;
  onClick?: () => void;
  href?: string;
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

  if (href) {
    return (
      <Link href={href} className={className}>
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
