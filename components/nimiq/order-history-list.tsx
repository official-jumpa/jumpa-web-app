"use client";

import { Fragment } from "react";
import { TransactionEmpty } from "@/components/transactions/transaction-empty";
import {
  TransactionRow,
  TransactionRule,
} from "@/components/transactions/transaction-row";
import { historyEntry } from "@/lib/nimiq/history";
import type { PublicOrder } from "@/lib/nimiq/order-status";

/** Orders in the web app's transaction card; undefined `orders` is still loading. */
export function OrderHistoryList({
  orders,
  error,
  onRetry,
  onOpen,
}: {
  orders?: PublicOrder[];
  /** Shown in place of the list when nothing has loaded yet. */
  error?: string;
  onRetry: () => void;
  onOpen: (orderId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-5 py-5">
      {orders ? (
        orders.length === 0 ? (
          <TransactionEmpty />
        ) : (
          orders.map((order, index) => (
            <Fragment key={order.id}>
              {index > 0 ? <TransactionRule /> : null}
              <TransactionRow
                transaction={historyEntry(order)}
                onSelect={() => onOpen(order.id)}
              />
            </Fragment>
          ))
        )
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <p className="text-xs leading-4 font-medium text-jumpa-neutral-400">
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="tap text-sm leading-4 font-medium text-jumpa-primary-600 active:scale-95"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="flex animate-pulse flex-col gap-3 py-2">
          <div className="h-10 w-full rounded-md bg-jumpa-neutral-200/50" />
          <div className="h-10 w-full rounded-md bg-jumpa-neutral-200/50" />
        </div>
      )}
    </div>
  );
}
