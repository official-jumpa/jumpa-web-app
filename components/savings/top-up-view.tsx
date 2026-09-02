"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AmountScreen } from "@/components/transfer/amount-screen";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { RecipientTag } from "@/components/transfer/recipient-tag";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import type { SavingsPlan } from "@/lib/savings";
import { DEMO_PIN, formatAmount, SEND_BALANCE } from "@/lib/transfer";
import type { Promotion } from "@/lib/wallet";

type Sheet = "review" | "pin" | null;

const TOP_UP_AMOUNTS = [25, 50, 100] as const;

/** Move more money into an existing plan: amount, review, PIN, receipt. */
export function TopUpView({
  plan,
  back,
  promotions,
}: {
  plan: SavingsPlan;
  back: string;
  promotions: Promotion[];
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);
  const [done, setDone] = useState(false);

  const total = `$${formatAmount(amount)}`;

  const details = (
    <DetailList>
      <DetailRow label="From" value="Jumpa wallet" />
      <DetailRow label="Plan" value={plan.name} />
      <DetailRow label="Saved so far" value={plan.saved} />
      <DetailRow label="Target" value={plan.target} rule={false} />
    </DetailList>
  );

  if (done) {
    return (
      <TransferSuccess
        back={back}
        title="Top up Successful"
        titleFirst
        actionsFirst
        amount={total}
        details={details}
        promotions={promotions}
        ctaLabel="Back to plan"
        ctaHref={back}
      />
    );
  }

  return (
    <>
      <AmountScreen
        recipient={
          <RecipientTag primary={plan.name} secondary={plan.frequency} />
        }
        onClose={() => router.push(back)}
        amount={amount}
        symbol={SEND_BALANCE.symbol}
        balance={SEND_BALANCE.balance}
        chips={TOP_UP_AMOUNTS}
        chipUnit={SEND_BALANCE.symbol}
        onAmountChange={setAmount}
        onReview={() => setSheet("review")}
      />

      {sheet === "review" ? (
        <ReviewSheet
          summary={
            <RecipientTag primary={plan.name} secondary={plan.frequency} />
          }
          headline={total}
          headlineLabel="YOU ARE ADDING"
          confirmLabel="Confirm top up"
          onConfirm={() => setSheet("pin")}
          onClose={() => setSheet(null)}
        >
          {details}
        </ReviewSheet>
      ) : null}

      {sheet === "pin" ? (
        <TransferPinSheet
          error={pinError}
          onRetry={() => setPinError(false)}
          onClose={() => setSheet("review")}
          onComplete={(pin) => {
            if (pin === DEMO_PIN) setDone(true);
            else setPinError(true);
          }}
        />
      ) : null}
    </>
  );
}
