import type { ReactNode, RefObject } from "react";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { Button, type ButtonVariant } from "@/components/ui/button";

/** Header, fields and a bottom-anchored CTA — the shell both create flows use. */
export function SavingsForm({
  back,
  onBack,
  title,
  cta,
  ctaVariant = "gradient",
  fields,
  onSubmit,
  children,
}: {
  back: string;
  /** Steps back inside a multi-stage flow instead of leaving the route. */
  onBack?: () => void;
  title: string;
  cta: string;
  /** The lock and circle forms draw the sheet-toned label; target keeps the lime one. */
  ctaVariant?: ButtonVariant;
  /** Scope `revealFirstError` scrolls within. */
  fields: RefObject<HTMLDivElement | null>;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
    >
      <TransferHeader back={back} onBack={onBack} title={title} />

      <div ref={fields} className="mt-6 flex flex-col gap-5">
        {children}
      </div>

      <Button type="submit" variant={ctaVariant} size="lg" className="mt-auto">
        {cta}
      </Button>
    </form>
  );
}

/** Tinted block the terms and dates sit in, under the plain fields. */
export function SavingsPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-surface bg-jumpa-primary-50 px-2.5 pt-4 pb-2.5">
      {children}
    </div>
  );
}

/** Hairline the design draws inside the panel. */
export function SavingsRule() {
  return <span className="-mb-px block h-px w-full bg-jumpa-primary-100" />;
}
