"use client";

import type { PublicOrder } from "@/lib/nimiq/order-status";
import { OrderHistoryList } from "./order-history-list";

/** The latest settled orders on home, with a way into the full history. */
export function RecentActivity({
  orders,
  error,
  onRetry,
  onOpen,
  onSeeAll,
}: {
  orders?: PublicOrder[];
  error?: string;
  onRetry: () => void;
  onOpen: (orderId: string) => void;
  onSeeAll: () => void;
}) {
  return (
    <section className="mt-8">
      <div className="flex h-4 items-center justify-between">
        <h2 className="text-sm leading-4 font-semibold text-jumpa-black">
          Transaction History
        </h2>
        {orders?.length ? (
          <button
            type="button"
            onClick={onSeeAll}
            className="tap text-sm leading-4 font-medium text-jumpa-primary-600 active:scale-95"
          >
            See All
          </button>
        ) : null}
      </div>
      <div className="mt-4">
        <OrderHistoryList
          orders={orders}
          error={error}
          onRetry={onRetry}
          onOpen={onOpen}
        />
      </div>
    </section>
  );
}
