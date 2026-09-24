import type { ReactNode } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Confirmation for an account-level action. The medallion carries the tone. */
export function AccountSheet({
  icon,
  tone,
  title,
  children,
  error,
  confirmLabel,
  pendingLabel,
  pending,
  disabled,
  onConfirm,
  onClose,
}: {
  icon: ReactNode;
  tone: "brand" | "danger";
  title: string;
  children: ReactNode;
  error?: string | null;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const danger = tone === "danger";
  const confirmVariant: ButtonVariant = danger ? "danger" : "gradientSheet";

  return (
    <BottomSheet onClose={onClose} pb="pb-5">
      <span
        className={cn(
          "mx-auto mt-2 flex size-16 items-center justify-center rounded-full",
          danger
            ? "bg-jumpa-danger-50 text-jumpa-danger"
            : "bg-jumpa-primary-50 text-jumpa-primary-600",
        )}
      >
        {icon}
      </span>

      <h2 className="mt-4 text-center text-xl leading-6 font-bold text-jumpa-black">
        {title}
      </h2>

      <div className="mt-3 flex flex-col gap-3">{children}</div>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-tile bg-jumpa-danger-50 px-3 py-2 text-center text-xs leading-4 font-medium text-jumpa-danger"
        >
          {error}
        </p>
      ) : null}

      <Button
        variant={confirmVariant}
        size="lg"
        className="mt-5"
        disabled={pending || disabled}
        onClick={onConfirm}
      >
        {pending ? pendingLabel : confirmLabel}
      </Button>
      <Button
        size="lg"
        className="mt-2 font-semibold"
        disabled={pending}
        onClick={onClose}
      >
        No, Cancel
      </Button>
    </BottomSheet>
  );
}
