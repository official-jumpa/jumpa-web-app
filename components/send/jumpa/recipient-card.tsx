import type { ReactNode } from "react";
import { RecipientAvatar } from "@/components/send/jumpa/recipient-avatar";
import { type JumpaRecipient, recipientHandle } from "@/lib/jumpa-send";

/** Explicit heights: the border sits outside the box, as everywhere else. */
const VARIANT = {
  match: { label: "Matching recipient", tone: "text-jumpa-primary-600", height: "h-23.25" },
  chosen: { label: "Recipient", tone: "text-jumpa-neutral-400", height: "h-22.75" },
} as const;

/** The lavender card naming who the money goes to. `trailing` is its control. */
export function RecipientCard({
  recipient,
  variant,
  trailing,
}: {
  recipient: JumpaRecipient;
  /** `match` on the lookup step, `chosen` on the amount step. */
  variant: keyof typeof VARIANT;
  trailing?: ReactNode;
}) {
  const v = VARIANT[variant];
  return (
    <div
      className={`flex w-full items-center gap-3 rounded-tile border border-jumpa-primary-50 bg-jumpa-surface pr-4 pl-4.25 ${v.height}`}
    >
      <RecipientAvatar recipient={recipient} />
      <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
        <span className={`text-xs leading-4.5 ${v.tone}`}>{v.label}</span>
        <span className="truncate text-sm leading-4.5 font-medium text-jumpa-black capitalize">
          {recipient.name}
        </span>
        <span className="truncate text-xs leading-4.5 font-semibold text-jumpa-neutral-400">
          {recipientHandle(recipient)}
        </span>
      </span>
      {trailing}
    </div>
  );
}
