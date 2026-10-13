import type { ReactNode } from "react";
import { FieldError } from "@/components/ui/field-error";

/** Explicit h-11.5 — the design's stroke is inside, a CSS border is outside. */
const SHELL =
  "flex h-11.5 items-center gap-2 rounded-surface border bg-jumpa-white py-1 pr-1 pl-3";

/** `cn` is a plain join, so the border colour has to be chosen, not layered. */
export function savingsShell(invalid?: boolean): string {
  return `${SHELL} ${invalid ? "border-jumpa-warning" : "border-jumpa-grey-100"}`;
}

export const SAVINGS_INPUT =
  "min-w-0 flex-1 bg-transparent text-xs leading-4 font-medium text-jumpa-primary-950 " +
  "outline-none placeholder:text-jumpa-neutral-425";

export function SavingsLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium text-jumpa-black">{children}</span>
  );
}

type FieldProps = {
  label: ReactNode;
  error?: string;
  children: ReactNode;
};

/**
 * Label over a bordered field, with its validation message underneath. A
 * `<label>` forwards any click inside it to its first control, so it takes one
 * control only; use `SavingsFieldset` for more.
 */
export function SavingsField({ label, error, children }: FieldProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children
    <label className="flex flex-col gap-3">
      <SavingsLabel>{label}</SavingsLabel>
      <span className={savingsShell(Boolean(error))}>{children}</span>
      <FieldError>{error}</FieldError>
    </label>
  );
}

/** `SavingsField` for several controls, like a stepper: the label is not clickable. */
export function SavingsFieldset({ label, error, children }: FieldProps) {
  return (
    <fieldset className="min-w-0">
      {/* Flex, so the label's own line box sets the height, not the legend's strut. */}
      <legend className="mb-3 flex">
        <SavingsLabel>{label}</SavingsLabel>
      </legend>
      <div className="flex flex-col gap-3">
        <div className={savingsShell(Boolean(error))}>{children}</div>
        <FieldError>{error}</FieldError>
      </div>
    </fieldset>
  );
}
