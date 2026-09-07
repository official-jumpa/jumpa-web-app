"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { FileDownloadIcon } from "@/components/ui/icons/file-download";
import { ScreenHeader } from "@/components/ui/screen-header";
import { getAssetLogo } from "@/lib/assets";
import { cn } from "@/lib/cn";
import type { Transaction } from "@/lib/wallet";

const STATUS_LABEL = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
} as const;

/** One entry in full: asset, amount, outcome, then every detail we hold on it. */
export function TransactionDetail({ id }: { id: string }) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch(`/api/transactions/${encodeURIComponent(id)}`)
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
  }, [id]);

  const rows = transaction?.rows ?? [];

  return (
    <div className="flex flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-10">
      <ScreenHeader back="/transactions" title="Transactions" round />

      <section className="mt-2 flex flex-col items-center gap-6 rounded-3xl bg-jumpa-neutral-50 py-6">
        {transaction ? (
          <>
            <div className="flex flex-col items-center gap-4.5">
              <Image
                src={getAssetLogo(transaction.token || transaction.chain)}
                alt=""
                width={100}
                height={100}
                className="size-12.5 rounded-full"
              />
              <p className="text-[32px] leading-10 font-medium text-jumpa-black">
                {transaction.headline || transaction.amount}
              </p>
              <div className="flex flex-col items-center gap-1 text-center text-jumpa-black">
                <p className="text-base leading-5 font-medium">
                  {transaction.heading}
                </p>
                <p className="text-xs leading-4.5">{transaction.timestamp}</p>
              </div>
            </div>

            <div className="flex h-8 items-center justify-center">
              <span
                className={cn(
                  "rounded-pill bg-jumpa-neutral-100 px-4 py-2 text-[10px] leading-4 font-medium",
                  transaction.status === "failed"
                    ? "text-jumpa-danger"
                    : "text-jumpa-neutral-750",
                )}
              >
                {STATUS_LABEL[transaction.status]}
              </span>
            </div>
          </>
        ) : (
          <p className="py-16 text-xs font-medium text-jumpa-neutral-400">
            {missing ? "This transaction is no longer available." : "Loading…"}
          </p>
        )}
      </section>

      {rows.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base leading-5.5 text-jumpa-black">
            Transaction details
          </h2>
          <dl className="flex flex-col gap-3 rounded-3xl bg-jumpa-neutral-50 p-3 text-xs leading-5 font-medium text-jumpa-black">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4"
              >
                <dt className="shrink-0">{row.label}</dt>
                <dd className="truncate text-right">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {transaction ? (
        <button
          type="button"
          className="tap mt-8 flex h-16 items-center justify-center gap-2 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-6 text-xs leading-3.5 text-jumpa-black active:scale-[0.98]"
        >
          <FileDownloadIcon className="size-6 text-jumpa-primary-600" />
          Download Receipt
        </button>
      ) : null}
    </div>
  );
}
