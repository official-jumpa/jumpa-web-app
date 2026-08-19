import type { ReactNode } from "react";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";
import { cn } from "@/lib/cn";

const TONES = {
  neutral: "text-jumpa-neutral-900",
  danger: "text-jumpa-danger",
} as const;

/** Badge-icon note under the PIN box, the phrase and the backup options. */
export function InfoNote({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-xs leading-3.5",
        TONES[tone],
        className,
      )}
    >
      <SealAlertIcon
        className={cn(
          "size-6 shrink-0",
          tone === "danger" ? "text-jumpa-danger" : "text-jumpa-primary-600",
        )}
      />
      <span>{children}</span>
    </p>
  );
}
