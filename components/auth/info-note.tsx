import type { ReactNode } from "react";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";
import { cn } from "@/lib/cn";

const TONES = {
  neutral: { text: "text-jumpa-neutral-900", icon: "text-jumpa-primary-600" },
  brand: { text: "text-jumpa-primary-950", icon: "text-jumpa-primary-600" },
  danger: { text: "text-jumpa-danger", icon: "text-jumpa-danger" },
  warning: { text: "text-jumpa-warning", icon: "text-jumpa-warning" },
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
        TONES[tone].text,
        className,
      )}
    >
      <SealAlertIcon className={cn("size-6 shrink-0", TONES[tone].icon)} />
      <span>{children}</span>
    </p>
  );
}
