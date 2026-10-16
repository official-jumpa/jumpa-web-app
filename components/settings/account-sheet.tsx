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
  confirmVariant: customConfirmVariant,
  cancelVariant = "light",
  cancelLabel = "No, Cancel",
  swapButtons = false,
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
  confirmVariant?: ButtonVariant;
  cancelVariant?: ButtonVariant;
  cancelLabel?: string;
  /** When true, renders Cancel first (as the recommended primary action) followed by Confirm. */
  swapButtons?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const danger = tone === "danger";
  const defaultConfirmVariant: ButtonVariant = danger ? "danger" : "gradientSheet";
  const resolvedConfirmVariant = customConfirmVariant ?? defaultConfirmVariant;

  const confirmBtn = (
    <Button
      key="confirm"
      variant={resolvedConfirmVariant}
      size="lg"
      className={swapButtons ? "mt-2" : "mt-5"}
      disabled={pending || disabled}
      onClick={onConfirm}
    >
      {pending ? pendingLabel : confirmLabel}
    </Button>
  );

  const cancelBtn = (
    <Button
      key="cancel"
      variant={cancelVariant}
      size="lg"
      className={swapButtons ? "mt-5 font-semibold" : "mt-2 font-semibold"}
      disabled={pending}
      onClick={onClose}
    >
      {cancelLabel}
    </Button>
  );

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
          className="mt-3 rounded-panel bg-jumpa-danger-50 px-3.5 py-2.5 text-center text-xs leading-4 font-medium text-jumpa-danger"
        >
          {error}
        </p>
      ) : null}

      {swapButtons ? (
        <>
          {cancelBtn}
          {confirmBtn}
        </>
      ) : (
        <>
          {confirmBtn}
          {cancelBtn}
        </>
      )}
    </BottomSheet>
  );
}
