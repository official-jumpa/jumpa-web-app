"use client";

import { useState } from "react";
import { BillSummary } from "@/components/bills/bill-review";
import { DataPlans } from "@/components/bills/data-plans";
import { RechargeForm } from "@/components/bills/recharge-form";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { ReceiptSheet } from "@/components/transactions/receipt-sheet";
import { FileDownloadIcon } from "@/components/ui/icons/file-download";
import { type DataPlan, getNetwork, getPeriodLabel } from "@/lib/bills";
import { newReference, type Receipt } from "@/lib/receipt";
import { DEMO_PIN } from "@/lib/transfer";

type Stage = "form" | "plans" | "done";
type Sheet = "review" | "pin" | null;

/** Data bundles: recipient, plan, review, PIN, receipt. */
export function MobileDataView() {
  const [stage, setStage] = useState<Stage>("form");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);
  const [phone, setPhone] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  // Stamped once the payment lands, so the receipt reads the same every time.
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const network = getNetwork(networkId);

  const settle = () => {
    if (!plan || !network) return;

    setReceipt({
      // TODO: replace with the reference the bills provider returns.
      reference: newReference("DATA"),
      title: "Data purchase",
      amount: plan.price,
      status: "Successful",
      timestamp: new Date().toLocaleString(),
      rows: [
        { label: "From", value: "Jumpa wallet" },
        { label: "Type", value: "Data" },
        { label: "Network", value: network.label },
        { label: "Phone number", value: phone },
        { label: "Plan", value: plan.validity },
      ],
    });
    setStage("done");
  };

  if (stage === "done" && plan) {
    return (
      <TransferSuccess
        back="/data"
        title="Successful"
        titleFirst
        actionsFirst
        amount={plan.price}
        ctaLabel="Back to home"
        actions={
          <>
            <button
              type="button"
              onClick={() => setReceiptOpen(true)}
              className="tap flex h-13 w-full items-center gap-3 rounded-tile bg-jumpa-neutral-50 px-4.5 text-xs leading-4 font-medium text-jumpa-black active:scale-[0.98]"
            >
              <FileDownloadIcon className="size-5 text-jumpa-primary-600" />
              Download Receipt
            </button>

            {receiptOpen && receipt ? (
              <ReceiptSheet
                receipt={receipt}
                onClose={() => setReceiptOpen(false)}
              />
            ) : null}
          </>
        }
      />
    );
  }

  if (stage === "plans" && network) {
    return (
      <>
        <DataPlans
          network={network}
          phone={phone}
          selected={plan}
          onSelect={setPlan}
          onClose={() => setStage("form")}
          onContinue={() => setSheet("review")}
        />

        {sheet === "review" && plan ? (
          <ReviewSheet
            summary={
              <BillSummary
                label="Data purchase"
                phone={phone}
                network={network}
              />
            }
            headline={`${plan.price} (${plan.size}-${getPeriodLabel(plan.period)})`}
            confirmLabel="Confirm payment"
            onConfirm={() => setSheet("pin")}
            onClose={() => setSheet(null)}
          >
            <DetailList>
              <DetailRow label="From" value="Jumpa wallet" />
              <DetailRow label="Type" value="Data" />
              <DetailRow label="Network" value={network.label} />
              <DetailRow label="Phone number" value={phone} />
              <DetailRow label="Plan" value={plan.validity} rule={false} />
            </DetailList>
          </ReviewSheet>
        ) : null}

        {sheet === "pin" ? (
          <TransferPinSheet
            error={pinError}
            onRetry={() => setPinError(false)}
            onClose={() => setSheet("review")}
            onComplete={(pin) => {
              if (pin === DEMO_PIN) settle();
              else setPinError(true);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <RechargeForm
      title="Data"
      phone={phone}
      network={networkId}
      onPhoneChange={setPhone}
      onNetworkChange={setNetworkId}
      onContinue={() => setStage("plans")}
    />
  );
}
