import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Tinted box of label/value rows, hairline-separated. */
export function DetailList({
  tone = "primary",
  children,
}: {
  tone?: "primary" | "secondary";
  children: ReactNode;
}) {
  return (
    <dl
      className={cn(
        "flex w-full flex-col gap-3 rounded-surface px-2.5 pt-4 pb-2.5",
        tone === "primary" ? "bg-jumpa-primary-50" : "bg-jumpa-secondary-50",
      )}
    >
      {children}
    </dl>
  );
}

export function DetailRow({
  label,
  value,
  rule = true,
}: {
  label: string;
  value: ReactNode;
  /** Hairline under the row; the last row in a list turns it off. */
  rule?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-2.5">
        <dt className="shrink-0 text-[10px] leading-4 text-jumpa-black/50">
          {label}
        </dt>
        <dd className="truncate text-xs leading-5 font-medium text-jumpa-black">
          {value}
        </dd>
      </div>
      {/* -mb-px: the design draws a zero-height line, a 1px box would add flow. */}
      {rule ? (
        <span className="-mb-px block h-px w-full bg-jumpa-neutral-100" />
      ) : null}
    </div>
  );
}
