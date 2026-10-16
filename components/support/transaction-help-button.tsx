import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircleQuestionIcon } from "@/components/ui/icons/message-circle-question";
import { supportHref } from "@/lib/support";

/**
 * "Get help with this transaction" on a receipt. Reopens the conversation that
 * already carries this transaction, so a second tap never starts a duplicate.
 */
export function TransactionHelpButton({
  transactionId,
}: {
  transactionId: string;
}) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  const open = async () => {
    setOpening(true);
    let href = supportHref("chat", { tx: transactionId });
    try {
      const res = await fetch(
        `/api/support/tickets?tx=${encodeURIComponent(transactionId)}`,
        {
          cache: "no-store",
        },
      );
      const data: { ticketId?: string | null } = res.ok ? await res.json() : {};
      if (data.ticketId) href = supportHref("chat", { ticket: data.ticketId });
    } catch {
      // Falls through to a new conversation with the transaction attached.
    }
    router.push(href);
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={opening}
      className="tap mt-3 flex h-12 items-center justify-center gap-2 rounded-surface text-sm leading-4 font-medium text-jumpa-primary-600 active:scale-[0.98] disabled:opacity-60"
    >
      <MessageCircleQuestionIcon className="size-5" />
      {opening ? "Opening…" : "Get help with this transaction"}
    </button>
  );
}
