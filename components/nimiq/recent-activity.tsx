"use client";

import { HomeSection } from "@/components/home/home-section";
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
    <HomeSection
      title="Transaction History"
      className="gap-4"
      action={
        orders?.length ? (
          <button
            type="button"
            onClick={onSeeAll}
            className="tap active:scale-95"
          >
            See All
          </button>
        ) : null
      }
    >
      <OrderHistoryList
        orders={orders}
        error={error}
        onRetry={onRetry}
        onOpen={onOpen}
      />
    </HomeSection>
  );
}
