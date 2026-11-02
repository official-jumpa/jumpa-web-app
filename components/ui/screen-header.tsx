import type { ReactNode } from "react";
import { BackButton, BackLink } from "@/components/ui/back-link";

/** Title type and colour together — `cn` is a plain join, so neither can be overridden. */
const TITLE_STYLE = {
  base: "text-base leading-4.5 text-jumpa-black",
  /** Transaction history. */
  lg: "text-lg leading-4 tracking-jumpa-snug text-jumpa-black",
  /** Airtime and data. */
  bill: "text-[17px] leading-none text-jumpa-ink",
} as const;

/** Back arrow, optional centred title, trailing control. The 44px hit area sets the row height. */
export function ScreenHeader({
  back,
  onBack,
  title,
  titleWeight = "semibold",
  titleStyle = "base",
  center,
  action,
  round,
}: {
  /** Where a direct load goes back to; in-app the arrow steps back through history. */
  back: string;
  /** Steps back inside the screen instead of through history. */
  onBack?: () => void;
  title?: string;
  /** The card frames draw a medium title; everywhere else it is semibold.
   *  A prop rather than a className — `cn` is a plain join. */
  titleWeight?: "semibold" | "medium";
  titleStyle?: keyof typeof TITLE_STYLE;
  center?: ReactNode;
  action?: ReactNode;
  /** Circled corner-up-left arrow, as the card screens draw it. */
  round?: boolean;
}) {
  const variant = round ? "round" : "arrow";

  return (
    <header className="relative flex h-11 items-center">
      {onBack ? (
        <BackButton onClick={onBack} variant={variant} />
      ) : (
        <BackLink href={back} variant={variant} />
      )}

      {center ? (
        <div className="absolute inset-x-12 flex justify-center items-center pointer-events-auto">
          {center}
        </div>
      ) : title ? (
        <h1
          className={`pointer-events-none absolute inset-x-11 text-center ${TITLE_STYLE[titleStyle]} ${
            titleWeight === "medium" ? "font-medium" : "font-semibold"
          }`}
        >
          {title}
        </h1>
      ) : null}

      <span className="ml-auto flex items-center">{action}</span>
    </header>
  );
}
