"use client";

import { useState } from "react";
import { BillSummary } from "@/components/bills/bill-review";
import { RechargeForm } from "@/components/bills/recharge-form";
import { RecipientPill } from "@/components/bills/recipient-pill";
import { AmountScreen } from "@/components/transfer/amount-screen";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { AIRTIME_AMOUNTS, getNetwork } from "@/lib/bills";
import { DEMO_PIN, formatAmount, SEND_BALANCE } from "@/lib/transfer";
import type { Promotion } from "@/lib/wallet";

type Stage = "form" | "amount" | "done";
type Sheet = "review" | "pin" | null;

/** Airtime top-up: recipient, amount, review, PIN, receipt. */
export function AirtimeView({ promotions }: { promotions: Promotion[] }) {
  const [stage, setStage] = useState<Stage>("form");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);
  const [phone, setPhone] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [amount, setAmount] = useState("");

  const network = getNetwork(networkId);
  const total = formatAmount(amount);

  const details = (
    <DetailList>
      <DetailRow label="From" value="Jumpa wallet" />
      <DetailRow label="Type" value="Airtime" />
      <DetailRow label="Network" value={network?.label ?? ""} />
      <DetailRow label="Phone number" value={phone} rule={false} />
    </DetailList>
  );

  if (stage === "done") {
    return (
      <TransferSuccess
        back="/airtime"
        title="Successful"
        titleFirst
        actionsFirst
        amount={total}
        details={details}
        promotions={promotions}
        ctaLabel="Back to home"
      />
    );
  }

  if (stage === "amount" && network) {
    return (
      <>
        <AmountScreen
          recipient={
            <RecipientPill>{`${network.label} - ${phone}`}</RecipientPill>
          }
          onClose={() => setStage("form")}
          amount={amount}
          symbol={SEND_BALANCE.symbol}
          balance={SEND_BALANCE.balance}
          chips={AIRTIME_AMOUNTS}
          chipUnit=""
          checkBalance={false}
          caption="Always verify the number is correct. Recharges to wrong numbers cannot be reversed."
          onAmountChange={setAmount}
          onReview={() => setSheet("review")}
        />

        {sheet === "review" ? (
          <ReviewSheet
            summary={
              <BillSummary
                label="Airtime recharge"
                phone={phone}
                network={network}
              />
            }
            headline={total}
            confirmLabel="Confirm payment"
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
              if (pin === DEMO_PIN) setStage("done");
              else setPinError(true);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <RechargeForm
      title="Airtime"
      phone={phone}
      network={networkId}
      onPhoneChange={setPhone}
      onNetworkChange={setNetworkId}
      onContinue={() => setStage("amount")}
    />
  );
}
