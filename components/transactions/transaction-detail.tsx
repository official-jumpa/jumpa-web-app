"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  TransactionHelpCard,
  useTransactionHelp,
} from "@/components/support/transaction-help";
import { ReceiptBand } from "@/components/transactions/receipt/receipt-band";
import {
  FailedHero,
  PendingHero,
  SuccessHero,
} from "@/components/transactions/receipt/receipt-hero";
import { ReceiptSheet } from "@/components/transactions/receipt-sheet";
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  buildReceipt,
  canShareFiles,
  downloadBlob,
  receiptFilename,
  shareReceipt,
} from "@/lib/receipt";
import {
  pillDate,
  receiptLabel,
  receiptMark,
  receiptStatus,
  toReceipt,
} from "@/lib/transaction-receipt";
import type { Transaction } from "@/lib/wallet";

const ACTION =
  "flex h-10.75 items-center justify-center gap-2 rounded-panel border border-jumpa-primary-50 text-xs leading-3.5 tracking-jumpa tap active:scale-[0.98] disabled:opacity-60";

/** The list URL a direct load returns to, keeping its filters but not the open entry. */
function listHref(search: string): string {
  const raw = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  raw.delete("id");
  const params = new URLSearchParams();
  raw.forEach((val, key) => {
    params.set(key.toLowerCase(), val.toLowerCase());
  });
  const query = params.toString();
  return query ? `/transactions?${query}` : "/transactions";
}

/** Download and Share for a settled receipt. */
function ReceiptActions({ transaction }: { transaction: Transaction }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const receipt = toReceipt(transaction);

  const onDownload = async () => {
    setBusy(true);
    try {
      downloadBlob(
        await buildReceipt(receipt, "png"),
        receiptFilename(receipt, "png"),
      );
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    try {
      if (canShareFiles() && (await shareReceipt(receipt))) return;
    } catch (err) {
      // Dismissing the share sheet is not a failure.
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
    setSheetOpen(true);
  };

  return (
    <>
      <div className="mt-4.25 grid grid-cols-[177fr_168fr] gap-3">
        <button
          type="button"
          onClick={onDownload}
          disabled={busy}
          className={`${ACTION} text-jumpa-black`}
        >
          <Image
            src="/images/receipt/download.svg"
            alt=""
            width={19}
            height={19}
          />
          Download Receipt
        </button>
        <button
          type="button"
          onClick={onShare}
          className={`${ACTION} text-jumpa-black`}
        >
          Share
        </button>
      </div>
      {sheetOpen ? (
        <ReceiptSheet receipt={receipt} onClose={() => setSheetOpen(false)} />
      ) : null}
    </>
  );
}

/** Try Again and Contact Support for a failed receipt. */
function FailedActions({
  transactionId,
  onRetry,
}: {
  transactionId: string;
  onRetry: () => void;
}) {
  const help = useTransactionHelp(transactionId);
  return (
    <div className="mt-4.25 grid grid-cols-[177fr_168fr] gap-3">
      <button
        type="button"
        onClick={onRetry}
        className={`${ACTION} bg-jumpa-primary-600 font-medium text-jumpa-white`}
      >
        Try Again
      </button>
      <button
        type="button"
        onClick={help.open}
        disabled={help.opening}
        className={`${ACTION} font-medium text-jumpa-black`}
      >
        Contact Support
      </button>
    </div>
  );
}

/** One entry as a receipt: outcome, the ticket band of details, then actions and support. */
export function TransactionDetail({
  id,
  initialTransaction,
}: {
  id: string;
  initialTransaction?: Transaction | null;
}) {
  const [transaction, setTransaction] = useState<Transaction | null>(
    initialTransaction ?? null,
  );
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (initialTransaction) return;
    let isMounted = true;

    const cleanId = id.replace(/^tx_/i, "").toLowerCase();
    fetch(`/api/v1/transactions/${encodeURIComponent(cleanId)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (isMounted) setTransaction(data.transaction);
      })
      .catch(() => {
        if (isMounted) setMissing(true);
      });

    return () => {
      isMounted = false;
    };
  }, [id, initialTransaction]);

  // When a transaction is pending, poll every 10s (for up to 2 minutes) while the user views it
  useEffect(() => {
    if (transaction?.status !== "pending") return;

    let isMounted = true;
    const cleanId = id.replace(/^tx_/i, "").toLowerCase();
    const startTime = Date.now();
    const TWO_MINUTES_MS = 2 * 60 * 1000;

    const interval = setInterval(async () => {
      if (Date.now() - startTime >= TWO_MINUTES_MS) {
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(
          `/api/v1/transactions/${encodeURIComponent(cleanId)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !data?.transaction) return;

        setTransaction(data.transaction);
        if (data.transaction.status !== "pending") {
          clearInterval(interval);
        }
      } catch {
        // Silently continue polling on transient network issue
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [id, transaction?.status]);

  const searchParams = useSearchParams();
  const router = useRouter();

  const currentSearch = () =>
    typeof window !== "undefined" && window.location.search
      ? window.location.search
      : searchParams?.toString() || "";

  const handleBack = () => {
    // If there's browser history, step back to preserve exact state
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace(listHref(currentSearch()));
  };

  const failed = transaction?.status === "failed";
  const amount = transaction ? transaction.headline || transaction.amount : "";

  return (
    <div className="flex flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-10">
      <ScreenHeader
        back={listHref(currentSearch())}
        onBack={handleBack}
        round
        action={
          <Image
            src="/logo/mark/purple.png"
            alt="Jumpa"
            width={803}
            height={381}
            className="w-10"
          />
        }
      />

      {transaction ? (
        <>
          {failed ? (
            <FailedHero />
          ) : transaction.status === "pending" ? (
            <PendingHero amount={amount} />
          ) : (
            <SuccessHero amount={amount} status={receiptStatus(transaction)} />
          )}

          <ReceiptBand
            label={receiptLabel(transaction)}
            mark={receiptMark(transaction)}
            date={pillDate(transaction.createdAt)}
            rows={transaction.rows ?? []}
            className={failed ? "mt-2" : "mt-7.25"}
          />

          {failed ? (
            <FailedActions
              transactionId={transaction.id}
              onRetry={handleBack}
            />
          ) : (
            <ReceiptActions transaction={transaction} />
          )}

          <div className="mt-3.5">
            <TransactionHelpCard transactionId={transaction.id} />
          </div>
        </>
      ) : (
        <p className="py-16 text-center text-xs font-medium text-jumpa-neutral-400">
          {missing ? "This transaction is no longer available." : "Loading…"}
        </p>
      )}
    </div>
  );
}
