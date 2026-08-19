import Image from "next/image";
import type { ReactNode } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";

/** Note beside an icon. Both confirm sheets stack one or two of these. */
function Note({
  icon,
  className,
  children,
}: {
  icon: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={`flex items-start gap-3 text-xs leading-4 ${className ?? "text-jumpa-neutral-500"}`}
    >
      <span className="shrink-0">{icon}</span>
      {children}
    </p>
  );
}

/** Destructive confirmation — freeze or delete a card. */
export function ConfirmSheet({
  art,
  title,
  note,
  noteIcon,
  warning,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  art: { src: string; width: number; height: number; className: string };
  title: string;
  note: string;
  noteIcon: ReactNode;
  /** Second, red note. Only the freeze sheet has one. */
  warning?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet onClose={onClose}>
      <Image
        src={art.src}
        alt=""
        width={art.width}
        height={art.height}
        className={`mx-auto mt-4 ${art.className}`}
      />

      <h2 className="mt-6 text-center text-2xl leading-7 font-bold text-jumpa-black">
        {title}
      </h2>

      <div className="mt-4 flex flex-col gap-3 border-t border-jumpa-neutral-100 pt-4">
        <Note icon={noteIcon}>{note}</Note>
        {warning ? (
          <Note
            icon={<SealAlertIcon className="size-5 text-jumpa-danger" />}
            className="text-jumpa-danger"
          >
            {warning}
          </Note>
        ) : null}
      </div>

      <Button
        variant="gradientSheet"
        size="lg"
        className="mt-6"
        onClick={onConfirm}
      >
        {confirmLabel}
      </Button>
      <Button size="lg" className="mt-2 font-semibold" onClick={onClose}>
        No, Cancel
      </Button>
    </BottomSheet>
  );
}
