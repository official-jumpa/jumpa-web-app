import type { ReactNode } from "react";
import { FieldError } from "@/components/ui/field-error";

/** Explicit h-11.5 — the design's stroke is inside, a CSS border is outside. */
const SHELL =
  "flex h-11.5 items-center gap-2 rounded-surface border bg-jumpa-white py-1 pr-1 pl-3";

/** `cn` is a plain join, so the border colour has to be chosen, not layered. */
export function savingsShell(invalid?: boolean): string {
  return `${SHELL} ${invalid ? "border-jumpa-danger" : "border-jumpa-grey-100"}`;
}

export const SAVINGS_INPUT =
  "min-w-0 flex-1 bg-transparent text-xs leading-4 font-medium text-jumpa-primary-950 " +
  "outline-none placeholder:text-jumpa-secondary-200";

export function SavingsLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium text-jumpa-black">{children}</span>
  );
}

/** Label over a bordered field, with its validation message underneath. */
export function SavingsField({
  label,
  error,
  children,
}: {
  label: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children
    <label className="flex flex-col gap-3">
      <SavingsLabel>{label}</SavingsLabel>
      <span className={savingsShell(Boolean(error))}>{children}</span>
      <FieldError>{error}</FieldError>
    </label>
  );
}
