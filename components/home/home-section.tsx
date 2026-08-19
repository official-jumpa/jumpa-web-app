import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Labelled home block. The gap under the label is per-section in the design. */
export function HomeSection({
  title,
  action,
  className = "gap-2",
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between text-sm leading-4.5 font-medium text-jumpa-black">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
