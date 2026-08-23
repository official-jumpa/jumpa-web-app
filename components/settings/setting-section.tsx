import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Section label above a grouped card. */
export function SettingSection({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3.5">
      <h2 className="text-sm leading-4 font-medium text-jumpa-black">
        {label}
      </h2>
      <div className={cn("flex flex-col gap-3.5", className)}>{children}</div>
    </section>
  );
}

/** The grouped surface itself. Rows inside it are separated by `SettingRule`. */
export function SettingCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-6 py-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** `-mb-px` keeps it out of the flow — Figma draws rules as zero-height lines. */
export function SettingRule() {
  return <span className="-mb-px h-px w-full bg-jumpa-neutral-100" />;
}
