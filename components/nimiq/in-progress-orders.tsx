"use client";

import { HomeSection } from "@/components/home/home-section";
import { OptionRow } from "@/components/transfer/option-row";
import { MoneyInsertIcon } from "@/components/ui/icons/money-insert";
import { MoneyWithdrawalIcon } from "@/components/ui/icons/money-withdrawal";
import { formatNaira, formatStable } from "@/lib/naira-deposit";
import type { PublicOrder } from "@/lib/nimiq/order-status";
import { sentTo } from "./order-details";

const outgoing = (order: PublicOrder) =>
  order.direction === "cash_out" || order.direction === "send";

const TITLE: Partial<Record<PublicOrder["direction"], string>> = {
  cash_out: "Cash-out in progress",
  send: "Transfer in progress",
};

function caption(order: PublicOrder): string {
  const usdt = `${formatStable(order.cryptoAmount)} USDT`;
  const naira = formatNaira(order.fiatAmount);
  if (order.direction === "send") return `${usdt} to ${sentTo(order)}`;
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
    <HomeSection title="In progress" className="gap-4">
      <div className="flex flex-col gap-5">
        {orders.map((order) => (
          <OptionRow
            key={order.id}
            Icon={outgoing(order) ? MoneyWithdrawalIcon : MoneyInsertIcon}
            title={TITLE[order.direction] ?? "Top-up in progress"}
            caption={caption(order)}
            onClick={() => onOpen(order.id)}
          />
        ))}
      </div>
    </HomeSection>
  );
}
