"use client";

import { CopyButton } from "@/components/auth/copy-button";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { Button } from "@/components/ui/button";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  type DepositState,
  formatNaira,
  formatStable,
  type OnrampOrder,
} from "@/lib/naira-deposit";

const COPY: Record<
  Exclude<DepositState, "completed">,
  { title: string; body: string }
> = {
  awaiting: {
    title: "Waiting for your transfer",
    body: "We'll credit your wallet as soon as your naira lands. This usually takes 1–5 minutes.",
  },
  processing: {
    title: "Converting your naira",
    body: "Your transfer arrived. We're sending the tokens to your wallet now.",
  },
  failed: {
    title: "Deposit didn't go through",
    body: "If money left your bank, contact support with the reference below and we'll sort it out.",
  },
};

/** Where the order is once the money is on its way, ending on the receipt. */
export function DepositStatus({
  order,
  token,
  state,
  onBack,
  onRetry,
}: {
  order: OnrampOrder;
  token: string;
  state: DepositState;
  /** Back to the bank details while they are still the thing to act on. */
  onBack?: () => void;
  onRetry: () => void;
}) {
  const received = `${formatStable(order.cryptoAmount)} ${token}`;
  const paid = formatNaira(order.fiatAmount);

  if (state === "completed") {
    return (
      <TransferSuccess
        back="/home"
        title="Deposit Successful"
        amount={received}
        subAmount={paid}
        reference={order.reference}
        receiptRows={[
          { label: "You paid", value: paid },
          { label: "You received", value: received },
        ]}
        details={
          <DetailList>
            <DetailRow label="You paid" value={paid} />
            <DetailRow label="You received" value={received} />
            <DetailRow label="Reference" value={order.reference} rule={false} />
          </DetailList>
        }
      />
    );
  }

  const copy = COPY[state];

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back="/home" onBack={onBack} title="Deposit Naira" round />

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {state === "failed" ? null : <JumpaLoader label={copy.title} />}
        <h1 className="mt-6 text-xl leading-6.75 font-semibold tracking-jumpa-snug text-jumpa-black">
          {copy.title}
        </h1>
        <p className="mt-2 max-w-72 text-sm leading-5 text-jumpa-neutral-425">
          {copy.body}
        </p>
        <p className="mt-6 text-base leading-5 font-semibold text-jumpa-black">
          {paid} → {received}
        </p>
        <span className="mt-3 flex items-center gap-1.5 text-xs leading-4 text-jumpa-black/50">
          Ref {order.reference}
          <CopyButton
            value={order.reference}
            name="Copy reference"
            className="[&>svg]:size-4"
          />
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {state === "failed" ? (
          <>
            <Button variant="gradient" size="lg" onClick={onRetry}>
              Try again
            </Button>
            <Button size="lg" href="/support">
              Contact support
            </Button>
          </>
        ) : (
          <Button variant="gradient" size="lg" href="/home">
            Go to Home
          </Button>
        )}
      </div>
    </div>
  );
}
