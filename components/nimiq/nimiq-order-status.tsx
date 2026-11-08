"use client";

import Image from "next/image";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { Button } from "@/components/ui/button";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import { getNetwork } from "@/lib/bills";
import { formatNaira, formatStable } from "@/lib/naira-deposit";
import {
  isBillDirection,
  isInFlight,
  type NimiqDirection,
  type PublicOrder,
} from "@/lib/nimiq/order-status";
import { SUPPORT_EMAIL } from "@/lib/support";
import { Medallion } from "./medallion";
import { OrderDetails, orderRows, topUpPayee } from "./order-details";
import { MINI_APP_PATH } from "./use-mini-app-nav";

type Copy = { title: string; body: string };

const FALLBACK_FAILURE =
  "Something went wrong with this order. Contact support with the reference.";

/** Each direction's screen title, failure title and retry button. */
const NAMES: Record<
  NimiqDirection,
  { screen: string; expired: string; failed: string; again: string }
> = {
  cash_out: {
    screen: "Cash out",
    expired: "Cash-out expired",
    failed: "Cash-out failed",
    again: "Start a new cash-out",
  },
  top_up: {
    screen: "Top up",
    expired: "Top-up expired",
    failed: "Top-up failed",
    again: "Start a new top-up",
  },
  airtime: {
    screen: "Airtime",
    expired: "Airtime expired",
    failed: "Airtime failed",
    again: "Buy airtime again",
  },
  data: {
    screen: "Mobile Data",
    expired: "Data expired",
    failed: "Data failed",
    again: "Buy data again",
  },
};

/** "airtime for 08031234567 on MTN", as the bill screens word it. */
function billLine(order: PublicOrder) {
  const what = order.direction === "airtime" ? "airtime" : "data";
  const phone = order.bill?.phone ?? "your number";
  const network = order.bill && getNetwork(order.bill.network)?.label;
  return `${what} for ${phone}${network ? ` on ${network}` : ""}`;
}

function progressCopy(order: PublicOrder): Copy {
  const usdt = `${formatStable(order.cryptoAmount)} USDT`;
  const naira = formatNaira(order.fiatAmount);
  if (isBillDirection(order.direction)) {
    if (order.status === "refunding") {
      return {
        title: "Returning your USDT",
        body: order.failureReason ?? FALLBACK_FAILURE,
      };
    }
    return order.status === "processing"
      ? {
          title: "Topping up",
          body: `Buying ${naira} of ${billLine(order)}. This page updates by itself.`,
        }
      : {
          title: "Sending your USDT",
          body: `Moving ${usdt} from your wallet. Jumpa pays the network fee.`,
        };
  }
  if (order.direction === "top_up") {
    return order.status === "processing"
      ? {
          title: "Sending your USDT",
          body: `Your ${naira} arrived. ${usdt} is on its way to ${topUpPayee(order)}.`,
        }
      : {
          title: "Waiting for your transfer",
          body: `We'll send ${usdt} as soon as your ${naira} lands. This page updates by itself.`,
        };
  }
  return order.status === "processing"
    ? {
        title: "Paying your bank",
        body: `${naira} is on its way to ${order.bank?.accountName ?? "your account"}. This usually takes a few minutes.`,
      }
    : {
        title: "Sending your USDT",
        body: `Moving ${usdt} from your wallet. Jumpa pays the network fee.`,
      };
}

function problemCopy(order: PublicOrder): Copy {
  const cashOut = order.direction === "cash_out";
  if (order.status === "awaiting_signature") {
    return {
      title: "Not signed yet",
      body: `This ${cashOut ? "cash-out" : "purchase"} was never signed, so nothing moved. It expires on its own.`,
    };
  }
  if (order.status === "refunded") {
    return {
      title: "USDT returned",
      body: order.failureReason ?? FALLBACK_FAILURE,
    };
  }
  if (order.status === "expired") {
    return order.direction !== "top_up"
      ? {
          title: NAMES[order.direction].expired,
          body: "It wasn't signed in time, so no money moved.",
        }
      : {
          title: "Top-up expired",
          body: "We didn't receive your transfer in time. If you sent Naira, contact support with the reference.",
        };
  }
  return {
    title: NAMES[order.direction].failed,
    body: order.failureReason ?? FALLBACK_FAILURE,
  };
}

/** Where an order stands: progress while it moves, then success or what went wrong. */
export function NimiqOrderStatus({
  order,
  onHome,
  backLabel,
  onRetry,
}: {
  order: PublicOrder;
  onHome: () => void;
  backLabel: string;
  /** Starts a fresh order in the same direction. */
  onRetry: (direction: NimiqDirection) => void;
}) {
  const cashOut = order.direction === "cash_out";
  const names = NAMES[order.direction];

  if (order.status === "completed" && isBillDirection(order.direction)) {
    return (
      <TransferSuccess
        back={MINI_APP_PATH}
        onBack={onHome}
        ctaHref={MINI_APP_PATH}
        ctaLabel="Done"
        amount={formatNaira(order.fiatAmount)}
        subAmount={`${formatStable(order.cryptoAmount)} USDT`}
        title={order.direction === "airtime" ? "Airtime sent" : "Data sent"}
        note={`Your ${billLine(order)} is done.`}
        details={<OrderDetails order={order} />}
        receiptRows={orderRows(order)}
        reference={order.reference}
      />
    );
  }

  if (order.status === "completed") {
    const usdt = `${formatStable(order.cryptoAmount)} USDT`;
    const naira = formatNaira(order.fiatAmount);
    return (
      <TransferSuccess
        back={MINI_APP_PATH}
        onBack={onHome}
        ctaHref={MINI_APP_PATH}
        ctaLabel="Done"
        amount={cashOut ? naira : usdt}
        subAmount={cashOut ? usdt : naira}
        title={cashOut ? "Cash-out complete" : "Top-up complete"}
        note={
          cashOut
            ? `Paid to ${order.bank?.accountName ?? "your bank account"}`
            : `The USDT is in ${topUpPayee(order)} on Polygon.`
        }
        details={<OrderDetails order={order} />}
        receiptRows={orderRows(order)}
        reference={order.reference}
      />
    );
  }

  const moving = isInFlight(order);
  const copy = moving ? progressCopy(order) : problemCopy(order);
  const support = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Nimiq Pay order ${order.reference}`,
  )}`;

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader
        back={MINI_APP_PATH}
        onBack={onHome}
        title={names.screen}
      />

      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
        {moving ? (
          <JumpaLoader label={copy.title} />
        ) : order.status === "awaiting_signature" ||
          order.status === "refunded" ? (
          <Medallion tone="calm">
            <Image
              src="/logo/mark/purple.png"
              alt=""
              width={803}
              height={381}
              className="w-9"
            />
          </Medallion>
        ) : (
          <Medallion tone="danger" />
        )}
        <div className="flex max-w-75 flex-col gap-2">
          <h1 className="text-xl leading-6 font-bold text-jumpa-black">
            {copy.title}
          </h1>
          <p className="text-sm leading-5 text-jumpa-neutral-500">
            {copy.body}
          </p>
        </div>
      </div>

      <OrderDetails order={order} />

      <div className="mt-6 flex flex-col gap-3">
        {moving ? (
          <>
            <Button variant="gradient" size="lg" onClick={onHome}>
              {backLabel}
            </Button>
            <p className="text-center text-xs leading-4 text-jumpa-neutral-400">
              You can close Jumpa; this keeps going.
            </p>
          </>
        ) : (
          <>
            <Button
              variant="gradient"
              size="lg"
              onClick={() => onRetry(order.direction)}
            >
              {names.again}
            </Button>
            <a
              href={support}
              className="tap flex h-11 items-center justify-center text-sm leading-4 font-medium text-jumpa-primary-600"
            >
              Contact support
            </a>
          </>
        )}
      </div>
    </div>
  );
}
