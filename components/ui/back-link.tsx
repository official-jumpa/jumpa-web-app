"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowBackIcon } from "@/components/ui/icons/arrow-back";
import { CornerUpLeftIcon } from "@/components/ui/icons/corner-up-left";
import { cn } from "@/lib/cn";
import { hasInAppHistory } from "@/lib/nav-history";

/** The three back glyphs the design uses. */
const GLYPH = {
  arrow: <ArrowBackIcon className="size-6 text-jumpa-black" />,
  round: (
    <span className="flex size-11 items-center justify-center rounded-full bg-jumpa-neutral-50 text-jumpa-primary-950">
      <CornerUpLeftIcon className="size-6" />
    </span>
  ),
  corner: <CornerUpLeftIcon className="size-6 text-jumpa-primary-950" />,
} as const;

/**
 * Steps back through history, so a screen reachable from more than one place
 * returns to the one you came from. `href` renders as a real link and is what a
 * direct load — where there is nothing behind this screen — falls back to.
 */
export function BackLink({
  href,
  variant = "arrow",
  label,
}: {
  href: string;
  variant?: keyof typeof GLYPH;
  /** Word beside the glyph, as the transfer screens draw it. */
  label?: string;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      aria-label={label ? undefined : "Go back"}
      onClick={(event) => {
        if (!hasInAppHistory()) return;
        event.preventDefault();
        router.back();
      }}
      className={cn(
        "tap flex items-center active:scale-90",
        label ? "h-11 gap-2 pr-2" : "size-11 justify-center",
      )}
    >
      {GLYPH[variant]}
      {label ? (
        <span className="text-base leading-4.5 font-medium text-jumpa-primary-950">
          {label}
        </span>
      ) : null}
    </Link>
  );
}

/** Same glyph as `BackLink`, for stepping back inside a multi-stage screen. */
export function BackButton({
  onClick,
  variant = "arrow",
}: {
  onClick: () => void;
  variant?: keyof typeof GLYPH;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back"
      className="tap flex size-11 items-center justify-center active:scale-90"
    >
      {GLYPH[variant]}
    </button>
  );
}
