import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

type TextFieldProps = ComponentPropsWithoutRef<"input"> & {
  label: string;
  /** Leading glyph, e.g. `<MailIcon />`. Sized and coloured here. */
  icon: ReactNode;
  /** Optional control at the far end, e.g. the password reveal toggle. */
  trailing?: ReactNode;
};

/** Labelled pill input. */
export function TextField({
  label,
  icon,
  trailing,
  className,
  ...input
}: TextFieldProps) {
  return (
    <label className={cn("flex flex-col gap-2", className)}>
      <span className="text-sm leading-4 font-medium text-jumpa-black">
        {label}
      </span>
      {/* Explicit height — Figma strokes sit inside the box, CSS borders outside. */}
      <span className="flex h-14 items-center gap-2 rounded-pill border border-jumpa-primary-100 bg-jumpa-primary-50 pr-[21px] pl-6 focus-within:border-jumpa-primary-300">
        <span className="shrink-0 text-jumpa-primary-950 [&>svg]:size-6">
          {icon}
        </span>
        <input
          className="min-w-0 flex-1 bg-transparent text-sm leading-4 font-medium text-jumpa-primary-950 outline-none placeholder:text-jumpa-primary-950/40"
          {...input}
        />
        {trailing}
      </span>
    </label>
  );
}
