"use client";

import { useState } from "react";
import { BillSummary } from "@/components/bills/bill-review";
import { DataPlans } from "@/components/bills/data-plans";
import { RechargeForm } from "@/components/bills/recharge-form";
import { ReceiptSheet } from "@/components/transactions/receipt-sheet";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { FileDownloadIcon } from "@/components/ui/icons/file-download";
import { ResultSheet } from "@/components/ui/result-sheet";
import { useNgnAccount } from "@/hooks/use-ngn-account";
import { type DataPlan, getNetwork, getPeriodLabel } from "@/lib/bills";
import { friendlyBillError, readBillResponse } from "@/lib/bills-errors";
import type { Receipt } from "@/lib/receipt";

type Stage = "form" | "plans" | "done";
type Sheet = "review" | "pin" | null;

/** Data bundles: recipient, plan, review, PIN, receipt. */
export function MobileDataView() {
  const { hasNgnAccount } = useNgnAccount();
  const [stage, setStage] = useState<Stage>("form");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);
  const [failure, setFailure] = useState<{
    title: string;
    message: string;
    retry?: boolean;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [phone, setPhone] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  // Stamped once the payment lands, so the receipt reads the same every time.
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const network = getNetwork(networkId);

  const fail = (
    rawOrMessage: unknown,
    overrideTitle?: string,
    overrideRetry?: boolean,
  ) => {
    setSheet(null);
    if (
      typeof rawOrMessage === "string" &&
      overrideTitle &&
      overrideRetry !== undefined
    ) {
      setFailure({
        title: overrideTitle,
        message: rawOrMessage,
        retry: overrideRetry,
      });
      return;
    }
    const friendly = friendlyBillError(rawOrMessage, "data");
    setFailure({
      title: overrideTitle ?? friendly.title,
      message: friendly.message,
      retry: overrideRetry ?? friendly.retry,
    });
  };

  const handlePinComplete = async (pin: string) => {
    if (!plan || !network || isProcessing) return;
    if (!hasNgnAccount) {
      fail(
        "Please create a Naira account first",
        "Naira Account Required",
        false,
      );
      return;
    }
    setIsProcessing(true);
    setPinError(false);
    setFailure(null);

    const priceNum =
      plan.numericPrice || parseFloat(plan.price.replace(/[^0-9.]/g, "")) || 0;

    try {
      const res = await fetch("/api/bills/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          productName: plan.productName || plan.validity,
          amount: priceNum,
          packageSize: plan.size,
          validity: plan.validity,
          network: networkId,
          pin,
        }),
      });

      const { data, raw } = await readBillResponse(res);

      const detail = String(data?.error ?? "").toLowerCase();
      // A lockout also says "PIN", and tinting the box red would hide the wait
      // the server just told us about — so it goes through the mapper instead.
      const wrongPin =
        data?.code === "INVALID_PIN" ||
        (res.status === 400 &&
          detail.includes("pin") &&
          !detail.includes("too many"));

      if (!res.ok) {
        if (wrongPin) setPinError(true);
        else fail(data?.error || raw || "Data subscription failed.");
        setIsProcessing(false);
        return;
      }

      // A 200 the provider still refused must not render a receipt.
      if (data?.success === false) {
        fail(data?.error ?? data?.message ?? "Data subscription failed.");
        return;
      }

      setReceipt({
        reference: String(data?.reference ?? ""),
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
          { label: "Amount", value: plan.price },
        ],
      });

      setSheet(null);
      setStage("done");
    } catch (err) {
      fail(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (stage === "done" && plan) {
    return (
      <TransferSuccess
        back="/data"
        title={`Data purchase of ${network?.label} to ${phone} was successful`}
        titleFirst
        actionsFirst
        amount={`₦${plan.price}`}
        ctaLabel="Back to home"
        actions={
          <>
            <button
              type="button"
              onClick={() => setReceiptOpen(true)}
              className="tap flex h-13 w-full items-center justify-center gap-3 rounded-tile bg-jumpa-neutral-50 px-4.5 text-xs leading-4 font-medium text-jumpa-black active:scale-[0.98]"
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
          onNetworkChange={setNetworkId}
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
            onConfirm={() => setSheet("pin")}
            onClose={() => setSheet(null)}
          >
            <DetailList>
              <DetailRow label="From" value="Jumpa wallet" />
              <DetailRow label="Type" value="Data" />
              <DetailRow label="Network" value={network.label} />
              <DetailRow label="Phone number" value={phone} />
              <DetailRow label="Plan" value={plan.validity} />
              <DetailRow label="Amount" value={plan.price} rule={false} />
            </DetailList>
          </ReviewSheet>
        ) : null}

        {sheet === "pin" ? (
          <TransferPinSheet
            error={pinError}
            pending={isProcessing}
            pendingLabel="Processing data subscription..."
            onRetry={() => {
              setPinError(false);
              setFailure(null);
            }}
            onClose={() => {
              if (!isProcessing) {
                setSheet("review");
                setPinError(false);
                setFailure(null);
              }
            }}
            onComplete={handlePinComplete}
          />
        ) : null}

        {failure ? (
          <ResultSheet
            title={failure.title}
            message={failure.message}
            onRetry={
              failure.retry
                ? () => {
                    setFailure(null);
                    setSheet("review");
                  }
                : undefined
            }
            onClose={() => setFailure(null)}
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
      hasAccount={hasNgnAccount}
      onPhoneChange={setPhone}
      onNetworkChange={setNetworkId}
      onContinue={() => {
        if (!hasNgnAccount) {
          fail(
            "Please create a Naira account first",
            "Naira Account Required",
            false,
          );
          return;
        }
        setStage("plans");
      }}
    />
  );
}
