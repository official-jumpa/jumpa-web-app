import type { ReactNode } from "react";
import { CaretDownIcon } from "@/components/ui/icons/caret-down";
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
const SHELL =
  "flex h-11.5 items-center gap-2 rounded-surface border border-jumpa-grey-100 bg-jumpa-white py-1 pr-1 pl-3";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children
    <label className={cn("flex flex-col gap-2", className)}>
      <FieldLabel>{label}</FieldLabel>
      <span className={SHELL}>{children}</span>
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

/** Tinted picker — country, asset, network. Native select, so mobile gets its own wheel. */
export function SelectField({
  label,
  icon,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  icon?: ReactNode;
  value: string;
  placeholder?: string;
  options: readonly string[];
  onChange: (next: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <span className="flex h-12 items-center gap-2 rounded-pill bg-jumpa-primary-50 px-4 text-jumpa-primary-950">
        {icon}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 appearance-none bg-transparent text-sm leading-4 font-medium outline-none"
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <CaretDownIcon aria-hidden="true" className="size-4 shrink-0" />
      </span>
    </label>
  );
}
