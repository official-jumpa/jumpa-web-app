"use client";

import { TransactionList } from "@/components/transactions/transaction-list";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import { ScreenHeader } from "@/components/ui/screen-header";
import { historyEntry } from "@/lib/nimiq/history";
import type { PublicOrder } from "@/lib/nimiq/order-status";
import { MINI_APP_PATH } from "./use-mini-app-nav";

/** The Txn tab: every order this device remembers for the wallet, newest first, as the main app lists them. */
export function NimiqHistory({
  orders,
  error,
  onRetry,
  onBack,
  onOpen,
}: {
  orders?: PublicOrder[];
  error?: string;
  onRetry: () => void;
  onBack: () => void;
  onOpen: (orderId: string) => void;
}) {
  return (
    <div className="flex flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-6">
      <ScreenHeader
        back={MINI_APP_PATH}
        onBack={onBack}
        round
        title="Transaction history"
        titleWeight="medium"
        titleStyle="lg"
      />

      <div className="mt-6">
        {orders ? (
          <TransactionList
            transactions={orders.map(historyEntry)}
            onSelect={(entry) => onOpen(entry.id)}
          />
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
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
          <div className="flex justify-center py-16">
            <JumpaLoader
              className="size-8"
              markClassName="w-4"
              label="Loading transactions"
            />
          </div>
        )}
      </div>

      {orders?.length ? (
        <p className="mt-6 text-center text-xs leading-4 text-jumpa-neutral-400">
          Orders started on this device.
        </p>
      ) : null}
    </div>
  );
}
