import type { ReactNode } from "react";
import { TriangleWarningIcon } from "@/components/ui/icons/triangle-warning";

/** The round badge over a status message; `danger` shows the warning mark by default. */
export function Medallion({
  tone,
  children,
}: {
  tone: "calm" | "danger";
  children?: ReactNode;
}) {
  return (
    <span
      className={
        tone === "danger"
          ? "flex size-20 items-center justify-center rounded-full bg-jumpa-danger-50 text-jumpa-danger"
          : "flex size-20 items-center justify-center rounded-full bg-jumpa-primary-50"
      }
    >
      {children ??
        (tone === "danger" ? <TriangleWarningIcon className="size-8" /> : null)}
    </span>
  );
}
