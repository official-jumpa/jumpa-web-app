"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { ActionRow } from "@/components/chat/action-row";
import {
  DetailBox,
  DetailRow,
  RampNotes,
  RampNotice,
  RampShell,
  type RampTone,
} from "@/components/chat/ramp-parts";
import { getNetwork } from "@/lib/bills";
import { copyText } from "@/lib/clipboard";
import { formatNaira, formatStable } from "@/lib/naira-deposit";
import { type NimiqApiError, nimiqApi } from "@/lib/nimiq/api-client";
import type { ChatProposal } from "@/lib/nimiq/chat-cards";
import {
  isBillDirection,
  type NimiqDirection,
  type PublicOrder,
} from "@/lib/nimiq/order-status";
import type { Eip1193 } from "@/lib/nimiq/provider";
import { orderRows } from "./order-details";
import type { TopUpStep } from "./use-chat-sessions";
import { primeOrder, useNimiqOrder } from "./use-nimiq-order";
import { type CheckoutStep, usePermitCheckout } from "./use-permit-checkout";

type CardProps = {
  proposal: ChatProposal;
  /** Set once the payment is placed; the card then follows the order. */
  orderId?: string;
  declined?: boolean;
  provider: Eip1193;
  address: Address;
  /** Recorded so history and a closed app can find the order. */
  onOrderCreated: (orderId: string) => void;
  /** The payment went through to the server. */
  onPlaced: (order: PublicOrder) => void;
  onDecline: () => void;
  /** Every state the placed order is seen in. Must be stable. */
  onUpdate: (order: PublicOrder) => void;
  topUpStep?: TopUpStep;
  onTopUpStep?: (step: TopUpStep) => void;
};

/** A payment confirmed and followed inside the chat. */
export function ChatPaymentCard({
  orderId,
  onUpdate,
  topUpStep,
  onTopUpStep,
  ...props
}: CardProps) {
  return orderId ? (
    <ChatOrderCard
      orderId={orderId}
      onUpdate={onUpdate}
      topUpStep={topUpStep}
      onTopUpStep={onTopUpStep}
    />
  ) : (
    <ProposalCard {...props} />
  );
}

const TITLE: Record<ChatProposal["kind"], string> = {
  airtime: "Buy airtime",
  data: "Buy data",
  "cash-out": "Cash out",
  "top-up": "Top up",
};

const FEE_ROW = { label: "Network fee", value: "Paid by Jumpa" };

function proposalRows(proposal: ChatProposal) {
  const network =
    "network" in proposal
      ? (getNetwork(proposal.network)?.label ?? proposal.network)
      : "";
  switch (proposal.kind) {
    case "airtime":
      return [
        { label: "Phone number", value: proposal.phone },
        { label: "Network", value: network },
        { label: "Airtime", value: formatNaira(proposal.amountNgn) },
        { label: "You pay", value: `≈ ${formatStable(proposal.usdt)} USDT` },
        FEE_ROW,
      ];
    case "data":
      return [
        { label: "Phone number", value: proposal.phone },
        { label: "Network", value: network },
        { label: "Plan", value: proposal.plan },
        { label: "Price", value: formatNaira(proposal.amountNgn) },
        { label: "You pay", value: `≈ ${formatStable(proposal.usdt)} USDT` },
        FEE_ROW,
      ];
    case "cash-out":
      return [
        {
          label: "You send",
          value: `${formatStable(proposal.amountUsdt)} USDT`,
        },
        { label: "They get", value: `≈ ${formatNaira(proposal.amountNgn)}` },
        { label: "Account name", value: proposal.accountName },
        { label: "Bank", value: proposal.bank },
        { label: "Account number", value: proposal.accountNumber },
        FEE_ROW,
      ];
    case "top-up":
      return [
        { label: "You pay", value: formatNaira(proposal.amountNgn) },
        { label: "You get", value: `≈ ${formatStable(proposal.usdt)} USDT` },
        { label: "To", value: "Your Nimiq Pay wallet" },
      ];
  }
}

const STEP_LABEL: Record<CheckoutStep, string> = {
  preparing: "Preparing your payment…",
  signing: "Approve it in Nimiq Pay",
  sending: "Sending…",
};

function ProposalCard({
  proposal,
  declined,
  provider,
  address,
  onOrderCreated,
  onPlaced,
  onDecline,
}: Omit<CardProps, "orderId" | "onUpdate">) {
  const bill = proposal.kind === "airtime" || proposal.kind === "data";
  const [openingTopUp, setOpeningTopUp] = useState(false);
  const [topUpError, setTopUpError] = useState<string>();
  const checkout = usePermitCheckout({
    provider,
    address,
    noun: bill ? "purchase" : "cash-out",
    submit: bill ? nimiqApi.submitBill : nimiqApi.submitCashOut,
    // A purchase lands as its result, never as "processing".
    awaitSettled: bill,
    onDone: (order) => {
      primeOrder(order);
      onPlaced(order);
    },
  });
  const { step, failure, notice } = checkout;

  const create = () => {
    switch (proposal.kind) {
      case "cash-out":
        return nimiqApi.createCashOut({
          address,
          amount: proposal.amountUsdt,
          bank: proposal.bank,
          accountNumber: proposal.accountNumber,
        });
      case "airtime":
        return nimiqApi.createBill({
          address,
          kind: "airtime",
          phone: proposal.phone,
          network: proposal.network,
          amountNgn: proposal.amountNgn,
        });
      case "data":
        return nimiqApi.createBill({
          address,
          kind: "data",
          phone: proposal.phone,
          network: proposal.network,
          productName: proposal.productName,
        });
      case "top-up":
        throw new Error("A top-up is paid by bank transfer, not signed.");
    }
  };

  const prepare = async () => {
    const created = await create();
    onOrderCreated(created.order.id);
    return created;
  };

  const openTopUp = async () => {
    if (proposal.kind !== "top-up") return;
    setOpeningTopUp(true);
    setTopUpError(undefined);
    try {
      const { order } = await nimiqApi.createTopUp({
        address,
        amountNgn: proposal.amountNgn,
      });
      onOrderCreated(order.id);
      primeOrder(order);
      onPlaced(order);
    } catch (error) {
      setTopUpError((error as NimiqApiError).message);
    } finally {
      setOpeningTopUp(false);
    }
  };

  const confirm = () => {
    if (proposal.kind === "top-up") return void openTopUp();
    if (failure?.retry) return failure.retry();
    checkout.dismissFailure();
    void checkout.run(prepare);
  };

  const busy = step
    ? STEP_LABEL[step]
    : openingTopUp
      ? "Getting your account details…"
      : undefined;
  const error = failure?.message ?? notice ?? topUpError;

  return (
    <RampShell
      title={TITLE[proposal.kind]}
      status={declined ? "Cancelled" : busy ? "Processing" : "Review"}
      tone={declined ? "error" : "pending"}
    >
      <DetailBox>
        {proposalRows(proposal).map((row) => (
          <DetailRow key={row.label} label={row.label} value={row.value} />
        ))}
      </DetailBox>
      {error && !busy ? <RampNotice tone="error">{error}</RampNotice> : null}
      {declined ? null : busy ? (
        <RampNotice tone="pending">{busy}</RampNotice>
      ) : (
        <ActionRow
          onConfirm={confirm}
          onCancel={onDecline}
          confirmLabel={error ? "Try again" : "Confirm"}
        />
      )}
    </RampShell>
  );
}

const ORDER_TITLE: Record<NimiqDirection, string> = {
  airtime: "Airtime",
  data: "Mobile data",
  cash_out: "Cash-out",
  top_up: "Top-up",
  send: "Transfer",
};

function statusOf(order: PublicOrder): { label: string; tone: RampTone } {
  switch (order.status) {
    case "completed":
      return { label: "Successful", tone: "done" };
    case "refunded":
      return { label: "Refunded", tone: "error" };
    case "failed":
      return { label: "Failed", tone: "error" };
    case "expired":
      return { label: "Expired", tone: "error" };
    case "awaiting_deposit":
      return { label: "Awaiting transfer", tone: "pending" };
    case "awaiting_signature":
      return { label: "Not approved", tone: "pending" };
    case "refunding":
      return { label: "Refunding", tone: "pending" };
    default:
      return { label: "Processing", tone: "pending" };
  }
}

/** What is happening while the order moves; nothing once it has settled. */
function progressOf(order: PublicOrder): string | undefined {
  switch (order.status) {
    case "relaying":
      return "Sending your USDT…";
    case "processing":
      return isBillDirection(order.direction)
        ? "Topping up the number…"
        : order.direction === "cash_out"
          ? "Paying the bank. This can take a few minutes."
          : "Transfer received. Sending your USDT…";
    default:
      return undefined;
  }
}

/** A placed order, kept current while the chat is open. */
export function ChatOrderCard({
  orderId,
  onUpdate,
  topUpStep,
  onTopUpStep,
}: {
  orderId: string;
  onUpdate: (order: PublicOrder) => void;
  /** A top-up waiting on a transfer: Confirm, then "I've sent the money"; Cancel beside both. */
  topUpStep?: TopUpStep;
  onTopUpStep?: (step: TopUpStep) => void;
}) {
  const { order, error } = useNimiqOrder(orderId);

  useEffect(() => {
    if (order) onUpdate(order);
  }, [order, onUpdate]);

  if (!order) {
    return (
      <RampShell
        title="Your order"
        status={error ? "Unavailable" : "Loading"}
        tone={error ? "error" : "pending"}
      >
        <RampNotice tone={error ? "error" : "pending"}>
          {error?.message ?? "Loading your order…"}
        </RampNotice>
      </RampShell>
    );
  }

  const progress = progressOf(order);
  const settledBadly =
    order.status === "failed" ||
    order.status === "refunded" ||
    order.status === "refunding" ||
    order.status === "expired";
  const awaitingTransfer =
    order.direction === "top_up" &&
    order.status === "awaiting_deposit" &&
    order.depositBank;
  // Only the chat drops it; if the money is sent anyway, the real status takes over.
  const cancelled = awaitingTransfer && topUpStep === "cancelled";
  const { label, tone } = cancelled
    ? { label: "Cancelled", tone: "error" as const }
    : statusOf(order);

  return (
    <RampShell title={ORDER_TITLE[order.direction]} status={label} tone={tone}>
      {awaitingTransfer && !cancelled && order.depositBank ? (
        <TransferDetails order={order} bank={order.depositBank} />
      ) : null}
      <DetailBox>
        {orderRows(order).map((row) => (
          <DetailRow key={row.label} label={row.label} value={row.value} />
        ))}
      </DetailBox>
      {settledBadly && order.failureReason ? (
        <RampNotice tone="error">{order.failureReason}</RampNotice>
      ) : null}
      {progress ? <RampNotice tone="pending">{progress}</RampNotice> : null}
      {order.explorerUrl ? (
        <a
          href={order.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="tap text-center text-xs leading-4 font-semibold text-jumpa-primary-600 active:scale-95"
        >
          View on Polygonscan
        </a>
      ) : null}
      {awaitingTransfer && !cancelled ? (
        topUpStep === "sent" ? (
          <RampNotice tone="pending">
            We&rsquo;re checking for your transfer. This card updates by itself
            once it arrives.
          </RampNotice>
        ) : (
          <ActionRow
            onConfirm={() =>
              onTopUpStep?.(topUpStep === "confirmed" ? "sent" : "confirmed")
            }
            onCancel={() => onTopUpStep?.("cancelled")}
            confirmLabel={
              topUpStep === "confirmed" ? "I’ve sent the money" : "Confirm"
            }
            fit={topUpStep === "confirmed"}
          />
        )
      ) : null}
    </RampShell>
  );
}

/** The account to pay a top-up into, with the number one tap from the clipboard. */
function TransferDetails({
  order,
  bank,
}: {
  order: PublicOrder;
  bank: NonNullable<PublicOrder["depositBank"]>;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <DetailBox>
        <DetailRow label="Send exactly" value={formatNaira(order.fiatAmount)} />
        <DetailRow label="Bank" value={bank.bankName} />
        <DetailRow label="Account name" value={bank.accountName} />
        <DetailRow label="Account number" value={bank.accountNumber} />
        <button
          type="button"
          onClick={async () => setCopied(await copyText(bank.accountNumber))}
          className="tap self-end text-xs leading-4 font-semibold text-jumpa-primary-600 active:scale-95"
        >
          {copied ? "Copied" : "Copy account number"}
        </button>
      </DetailBox>
      {bank.notes.length ? <RampNotes notes={bank.notes} /> : null}
    </>
  );
}
