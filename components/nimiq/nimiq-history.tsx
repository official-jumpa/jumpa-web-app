"use client";

import { TransferHeader } from "@/components/transfer/transfer-header";
import type { PublicOrder } from "@/lib/nimiq/order-status";
import { OrderHistoryList } from "./order-history-list";
import { MINI_APP_PATH } from "./use-mini-app-nav";

/** Every order this device remembers for the wallet, newest first. */
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
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader
        back={MINI_APP_PATH}
        onBack={onBack}
        title="Transaction History"
      />
      <div className="mt-6">
        <OrderHistoryList
          orders={orders}
          error={error}
          onRetry={onRetry}
          onOpen={onOpen}
        />
      </div>
      <p className="mt-4 text-center text-xs leading-4 text-jumpa-neutral-400">
        Orders started on this device.
      </p>
    </div>
  );
}
