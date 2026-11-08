"use client";

import { RampNotes } from "@/components/chat/ramp-parts";
import { BankTicket } from "@/components/receive/bank-ticket";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { Button } from "@/components/ui/button";
import { formatNaira, formatStable } from "@/lib/naira-deposit";
import type { PublicOrder } from "@/lib/nimiq/order-status";
import { topUpPayee } from "./order-details";
import { MINI_APP_PATH } from "./use-mini-app-nav";

const payBy = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  });

/** The account to pay for a top-up, until the person says they've sent it. */
export function TopUpPayment({
  order,
  onSent,
  onHome,
}: {
  order: PublicOrder;
  onSent: () => void;
  onHome: () => void;
}) {
  const deposit = order.depositBank;

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader back={MINI_APP_PATH} onBack={onHome} title="Top up" />

      <div className="flex flex-col items-center gap-2 pt-8 text-center">
        <p className="text-sm leading-5 text-jumpa-neutral-500">Send exactly</p>
        <p className="text-3xl leading-9 font-bold text-jumpa-black">
          {formatNaira(order.fiatAmount)}
        </p>
        <p className="max-w-75 text-sm leading-5 text-jumpa-neutral-500">
          {formatStable(order.cryptoAmount)} USDT will arrive in{" "}
          {topUpPayee(order)} on Polygon.
        </p>
      </div>

      {deposit ? (
        <div className="mt-6 flex flex-col gap-3">
          <BankTicket
            order={{
              reference: order.reference,
              bankName: deposit.bankName,
              accountName: deposit.accountName,
              accountNumber: deposit.accountNumber,
              cryptoAmount: order.cryptoAmount,
              fiatAmount: order.fiatAmount,
            }}
          />
          {deposit.notes.length ? <RampNotes notes={deposit.notes} /> : null}
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-3 pt-6">
        {order.expiresAt ? (
          <p className="text-center text-xs leading-4 text-jumpa-neutral-400">
            Pay before {payBy(order.expiresAt)}, or this account closes.
          </p>
        ) : null}
        <Button variant="gradient" size="lg" onClick={onSent}>
          I&rsquo;ve sent the money
        </Button>
      </div>
    </div>
  );
}
