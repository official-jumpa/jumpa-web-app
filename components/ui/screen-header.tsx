import type { ReactNode } from "react";
import { BackButton, BackLink } from "@/components/ui/back-link";

/** Back arrow, optional centred title, trailing control. The 44px hit area sets the row height. */
export function ScreenHeader({
  back,
  onBack,
  title,
  action,
  round,
}: {
  /** Where a direct load goes back to; in-app the arrow steps back through history. */
  back: string;
  /** Steps back inside the screen instead of through history. */
  onBack?: () => void;
  title?: string;
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

      {title ? (
        <h1 className="pointer-events-none absolute inset-x-11 text-center text-base leading-4.5 font-semibold text-jumpa-black">
          {title}
        </h1>
      ) : null}

      <span className="ml-auto flex items-center">{action}</span>
    </header>
  );
}
