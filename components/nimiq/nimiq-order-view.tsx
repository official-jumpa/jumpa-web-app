"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { JumpaLoaderScreen } from "@/components/ui/jumpa-loader";
import type { NimiqDirection, PublicOrder } from "@/lib/nimiq/order-status";
import { Medallion } from "./medallion";
import { NimiqNotice } from "./nimiq-notice";
import { NimiqOrderStatus } from "./nimiq-order-status";
import { TopUpPayment } from "./top-up-payment";
import { useCancelTopUp } from "./use-cancel-top-up";
import { useNimiqOrder } from "./use-nimiq-order";

/** One order, kept current: the payment details for an unpaid top-up, otherwise its status. */
export function NimiqOrderView({
  address,
  orderId,
  onHome,
  backLabel = "Back to home",
  onRetry,
  onMissing,
  onUpdate,
}: {
  /** The connected wallet, which may cancel its own unpaid top-up. */
  address: string;
  orderId: string;
  onHome: () => void;
  /** Names where `onHome` lands, e.g. the history list the order was opened from. */
  backLabel?: string;
  onRetry: (direction: NimiqDirection) => void;
  /** The server doesn't know this id; drop it from this device. Must be stable. */
  onMissing: (orderId: string) => void;
  /** Every state the order is seen in. Must be stable. */
  onUpdate?: (order: PublicOrder) => void;
}) {
  const { order, error, replace } = useNimiqOrder(orderId);
  const cancel = useCancelTopUp(address, replace);
  const [sent, setSent] = useState(false);
  const missing = !order && error?.status === 404;

  useEffect(() => {
    if (missing) onMissing(orderId);
  }, [missing, orderId, onMissing]);

  useEffect(() => {
    if (order) onUpdate?.(order);
  }, [order, onUpdate]);

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
        onCancel={() => void cancel.cancel(order.id)}
        cancelling={cancel.cancelling}
        cancelError={cancel.error}
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
