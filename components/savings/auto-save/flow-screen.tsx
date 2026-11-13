import type { ReactNode } from "react";
import { BackButton } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";

export type FlowCta = {
  label: string;
  onClick: () => void;
  /** False while the screen still needs something; the button dims and locks. */
  ready?: boolean;
};

/**
 * Page frame of the auto-save flow: round Back, a centred title or a trailing
 * chip, and the action held to the foot so it stays in reach on a short screen.
 */
export function FlowScreen({
  onBack,
  title,
  aside,
  cta,
  children,
}: {
  onBack: () => void;
  title?: string;
  /** Trailing slot of the header: the step chip. */
  aside?: ReactNode;
  cta: FlowCta;
  children: ReactNode;
}) {
  const ready = cta.ready ?? true;

  return (
    <div className="flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top)+1.3125rem)]">
      <header className="relative -ml-1 flex h-11 items-center justify-between">
        <BackButton onClick={onBack} variant="round" />
        {title ? (
          <h1 className="pointer-events-none absolute inset-x-14 text-center text-lg leading-4 font-medium tracking-jumpa-snug text-jumpa-black">
            {title}
          </h1>
        ) : null}
        {aside}
      </header>

      <div className="flex flex-1 flex-col">{children}</div>

      <footer className="sticky bottom-0 -mx-5 bg-jumpa-white px-6.5 pt-4.5 pb-[calc(env(safe-area-inset-bottom)+1.375rem)]">
        <Button
          variant={ready ? "gradient" : "soft"}
          size="lg"
          disabled={!ready}
          onClick={cta.onClick}
        >
          {cta.label}
        </Button>
      </footer>
    </div>
  );
}
