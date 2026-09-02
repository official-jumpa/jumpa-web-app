import type { ReactNode } from "react";
import { FieldError } from "@/components/ui/field-error";
import type { SelectOption } from "@/components/ui/select";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

/** Label above every transfer input. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs leading-5 font-medium text-jumpa-black">
      {children}
    </span>
  );
}

/** Explicit h-11.5 — the design's stroke is inside, a CSS border is outside. */
const SHELL_BASE =
  "flex h-11.5 items-center gap-2 rounded-surface border bg-jumpa-white py-1 pr-1 pl-3";

/** `cn` is a plain join, so the border colour has to be chosen, not layered. */
export function fieldShell(invalid?: boolean): string {
  return `${SHELL_BASE} ${invalid ? "border-jumpa-danger" : "border-jumpa-grey-100"}`;
}

const SHELL = fieldShell();

export function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  /** Validation message; also tints the shell. */
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children
    <label className={cn("flex flex-col gap-2", className)}>
      <FieldLabel>{label}</FieldLabel>
      <span className={fieldShell(Boolean(error))}>{children}</span>
      <FieldError>{error}</FieldError>
    </label>
  );
}

const INPUT =
  "min-w-0 flex-1 bg-transparent text-sm leading-4 font-medium text-jumpa-primary-950 " +
  "outline-none placeholder:text-jumpa-secondary-200";

export { INPUT as FIELD_INPUT, SHELL as FIELD_SHELL };

/** Gradient pill that drops the clipboard into the field beside it. */
export function PasteAction({ onPaste }: { onPaste: (text: string) => void }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          onPaste(await navigator.clipboard.readText());
        } catch {
          // Clipboard read is blocked in some browsers; long-press still works.
        }
      }}
      className="tap flex h-full w-17.5 shrink-0 items-center justify-center rounded-pill bg-[image:var(--gradient-jumpa-cta)] text-[10px] leading-3 font-semibold text-jumpa-alt-400 active:scale-95"
    >
      Paste
    </button>
  );
}

/** Tinted picker — country, asset, network. */
export function SelectField({
  label,
  icon,
  value,
  placeholder,
  options,
  error,
  onChange,
}: {
  label: string;
  icon?: ReactNode;
  value: string;
  placeholder?: string;
  options: SelectOption[];
  error?: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Select
        label={label}
        icon={icon}
        value={value}
        placeholder={placeholder}
        options={options}
        invalid={Boolean(error)}
        onValueChange={onChange}
      />
      <FieldError>{error}</FieldError>
    </div>
  );
}
