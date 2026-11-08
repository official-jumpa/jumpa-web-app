"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { JumpaLoaderScreen } from "@/components/ui/jumpa-loader";
import type { NimiqDirection } from "@/lib/nimiq/order-status";
import { Medallion } from "./medallion";
import { NimiqNotice } from "./nimiq-notice";
import { NimiqOrderStatus } from "./nimiq-order-status";
import { TopUpPayment } from "./top-up-payment";
import { useNimiqOrder } from "./use-nimiq-order";

/** One order, kept current: the payment details for an unpaid top-up, otherwise its status. */
export function NimiqOrderView({
  orderId,
  onHome,
  backLabel = "Back to home",
  onRetry,
  onMissing,
}: {
  orderId: string;
  onHome: () => void;
  /** Names where `onHome` lands, e.g. the history list the order was opened from. */
  backLabel?: string;
  onRetry: (direction: NimiqDirection) => void;
  /** The server doesn't know this id; drop it from this device. Must be stable. */
  onMissing: (orderId: string) => void;
}) {
  const { order, error } = useNimiqOrder(orderId);
  const [sent, setSent] = useState(false);
  const missing = !order && error?.status === 404;

  useEffect(() => {
    if (missing) onMissing(orderId);
  }, [missing, orderId, onMissing]);

  if (!order) {
    return missing ? (
      <NimiqNotice
        art={<Medallion tone="danger" />}
        title="We can't find this order"
        body="It may belong to another wallet. Your recent orders are on the home screen."
      >
        <Button variant="gradient" size="lg" onClick={onHome}>
          {backLabel}
        </Button>
      </NimiqNotice>
    ) : (
      <JumpaLoaderScreen label={error?.message ?? "Loading your order"} />
    );
  }

  if (
    order.direction === "top_up" &&
    order.status === "awaiting_deposit" &&
    !sent
  ) {
    return (
      <TopUpPayment
        order={order}
        onSent={() => setSent(true)}
        onHome={onHome}
      />
    );
  }

  return (
    <NimiqOrderStatus
      order={order}
      onHome={onHome}
      backLabel={backLabel}
      onRetry={onRetry}
    />
  );
}
