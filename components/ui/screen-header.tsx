import type { ReactNode } from "react";
import { BackButton, BackLink } from "@/components/ui/back-link";

/** Back arrow, optional centred title, trailing control. The 44px hit area sets the row height. */
export function ScreenHeader({
  back,
  onBack,
  title,
  titleWeight = "semibold",
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
          className={`pointer-events-none absolute inset-x-11 text-center text-base leading-4.5 text-jumpa-black ${
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
