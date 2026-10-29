import Link from "next/link";
import type { ReactNode } from "react";
import { CornerUpLeftIcon } from "@/components/ui/icons/corner-up-left";

const TITLE = {
  md: "text-base leading-4.5 font-medium text-jumpa-black",
  lg: "text-lg leading-4 tracking-jumpa-snug font-medium text-jumpa-black",
  /** Delete account: 17px semibold on ink. */
  strong: "text-[17px] leading-5 font-semibold text-jumpa-ink",
} as const;

const CONTROL =
  "flex size-11 items-center justify-center rounded-pill bg-jumpa-neutral-50 text-jumpa-primary-950 tap active:scale-95";

/** Circular back control with a centred title and an optional trailing control. */
export function SettingsHeader({
  back,
  onBack,
  title,
  action,
  size = "md",
}: {
  /** Where the arrow goes. Omit it when the screen steps back in its own state. */
  back?: string;
  /** Steps back inside a screen whose stages do not change the URL. */
  onBack?: () => void;
  title: string;
  action?: ReactNode;
  /** `lg` is the 18px title the send and profile screens draw; `strong` the delete screen's. */
  size?: keyof typeof TITLE;
}) {
  return (
    <header className="relative flex h-11 items-center justify-between">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className={CONTROL}
        >
          <CornerUpLeftIcon className="size-6" />
        </button>
      ) : (
        <Link
          prefetch
          href={back ?? "/home"}
          aria-label="Go back"
          className={CONTROL}
        >
          <CornerUpLeftIcon className="size-6" />
        </Link>
      )}

      <h1
        className={`pointer-events-none absolute inset-x-11 text-center ${TITLE[size]}`}
      >
        {title}
      </h1>

      {action ?? <span className="size-11" />}
    </header>
  );
}
