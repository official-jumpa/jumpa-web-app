"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supportHref } from "@/lib/support";

/** Opens the support thread for a transaction, resuming its open ticket when there is one. */
export function useTransactionHelp(transactionId: string) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  const open = async () => {
    if (opening) return;
    setOpening(true);
    let href = supportHref("chat", { tx: transactionId });
    try {
      const res = await fetch(
        `/api/support/tickets?tx=${encodeURIComponent(transactionId)}`,
        { cache: "no-store" },
      );
      const data: { ticketId?: string | null } = res.ok ? await res.json() : {};
      if (data.ticketId) href = supportHref("chat", { ticket: data.ticketId });
    } catch {
      // Starts a fresh thread instead.
    }
    router.push(href);
  };

  return { open, opening };
}

/** "Need help with this transaction?" — the card under every receipt. */
export function TransactionHelpCard({
  transactionId,
}: {
  transactionId: string;
}) {
  const { open, opening } = useTransactionHelp(transactionId);
  return (
    <button
      type="button"
      onClick={open}
      disabled={opening}
      className="flex h-13.75 w-full items-center gap-4.25 rounded-panel bg-jumpa-surface pl-6.25 text-left tap"
    >
      <Image
        src="/images/receipt/support.svg"
        alt=""
        width={31}
        height={31}
        className="shrink-0"
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-xs leading-4.5 font-medium tracking-jumpa text-jumpa-primary-600">
          Need help with this transaction?
        </span>
        <span className="text-[10px] leading-3.75 font-medium tracking-jumpa text-jumpa-slate-600">
          {opening
            ? "Opening support…"
            : "Our support team is here for you 24/7"}
        </span>
      </span>
    </button>
  );
}
