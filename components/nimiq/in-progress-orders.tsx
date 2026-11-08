"use client";

import { OptionRow } from "@/components/transfer/option-row";
import { MoneyInsertIcon } from "@/components/ui/icons/money-insert";
import { MoneyWithdrawalIcon } from "@/components/ui/icons/money-withdrawal";
import { formatNaira, formatStable } from "@/lib/naira-deposit";
import type { PublicOrder } from "@/lib/nimiq/order-status";

function caption(order: PublicOrder): string {
  const usdt = `${formatStable(order.cryptoAmount)} USDT`;
  const naira = formatNaira(order.fiatAmount);
  if (order.direction === "cash_out") {
    return `${naira} to ${order.bank?.accountName ?? "your bank"}`;
  }
  return order.status === "awaiting_deposit"
    ? `Waiting for your ${naira} transfer`
    : `${usdt} on its way`;
}

/** Orders still moving, so a closed app can pick them up from home. */
export function InProgressOrders({
  orders,
  onOpen,
}: {
  orders: PublicOrder[];
  onOpen: (orderId: string) => void;
}) {
  if (!orders.length) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm leading-4 font-semibold text-jumpa-black">
        In progress
      </h2>
      <div className="mt-4 flex flex-col gap-5">
        {orders.map((order) => (
          <OptionRow
            key={order.id}
            Icon={
              order.direction === "cash_out"
                ? MoneyWithdrawalIcon
                : MoneyInsertIcon
            }
            title={
              order.direction === "cash_out"
                ? "Cash-out in progress"
                : "Top-up in progress"
            }
            caption={caption(order)}
            onClick={() => onOpen(order.id)}
          />
        ))}
      </div>
    </section>
  );
}
