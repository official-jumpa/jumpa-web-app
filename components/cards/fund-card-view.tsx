"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AmountStep } from "@/components/transfer/amount-step";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { FundingAccount, VirtualCard } from "@/lib/cards";
import { DEMO_PIN, formatAmount } from "@/lib/transfer";

/**
 * Moves money from a wallet onto a card: amount, PIN, receipt. The design ends
 * at the amount screen, so the PIN sheet and receipt are the app's own — the
 * same two every other money movement finishes with.
 */
export function FundCardView({
  card,
  account,
}: {
  card: VirtualCard;
  account: FundingAccount;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [done, setDone] = useState(false);

  const total = `${formatAmount(amount || "0")} ${account.symbol}`;

  if (done) {
    return (
      <TransferSuccess
        back="/cards"
        amount={total}
        title="Card Funded"
        ctaLabel="Go to Card"
        ctaHref="/cards"
        note={
          <span>
            Your card ending <b className="font-bold">{card.last4}</b> has been
            topped up.
          </span>
        }
        details={
          <DetailList>
            <DetailRow label="From" value={`${account.label} wallet`} />
            <DetailRow label="To" value={`Virtual card **** ${card.last4}`} />
            <DetailRow label="Amount" value={total} />
            <DetailRow label="Fee" value="$0.00" rule={false} />
          </DetailList>
        }
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-4">
        <ScreenHeader
          back="/cards"
          onBack={() => router.replace("/cards")}
          title="Enter Amount"
          titleWeight="medium"
          round
        />
      </div>

      <AmountStep
        amount={amount}
        symbol={account.symbol}
        balance={account.balance}
        chipUnit={account.symbol}
        // The frame repeats the send flow's address warning here; this screen
        // has no address on it.
        caption="Funding moves money from your wallet onto your card. It can take a moment to show up."
        onAmountChange={setAmount}
        onReview={() => setPinOpen(true)}
      />

      {pinOpen ? (
        <TransferPinSheet
          error={pinError}
          onRetry={() => setPinError(false)}
          onComplete={(pin) => {
            if (pin !== DEMO_PIN) return setPinError(true);
            setPinOpen(false);
            setDone(true);
          }}
          onClose={() => setPinOpen(false)}
        />
      ) : null}
    </div>
  );
}
