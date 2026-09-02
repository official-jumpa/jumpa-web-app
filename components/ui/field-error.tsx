import { SealAlertIcon } from "@/components/ui/icons/seal-alert";

/** Inline validation message. Renders nothing when the field is fine. */
export function FieldError({ children }: { children?: string }) {
  if (!children) return null;

  return (
    <p
      role="alert"
      className="flex items-start gap-1.5 text-[10px] leading-3.5 font-medium text-jumpa-danger"
    >
      <SealAlertIcon className="size-3.5 shrink-0" />
      {children}
    </p>
  );
}

/** The same message over a purple canvas, where danger text alone is illegible. */
export function CanvasError({ children }: { children?: string }) {
  if (!children) return null;

  return (
    <p
      role="alert"
      className="flex items-center gap-1.5 rounded-pill bg-jumpa-danger px-3 py-1.5 text-[10px] leading-3.5 font-medium text-jumpa-white"
    >
      <SealAlertIcon className="size-3.5 shrink-0" />
      {children}
    </p>
  );
}
