"use client";

import { useState } from "react";
import { BillChip } from "@/components/bills/bill-chip";
import {
  type BillField,
  BillForm,
  checkRecipient,
} from "@/components/bills/bill-form";
import { BillSummary } from "@/components/bills/bill-review";
import { PayingFromCard } from "@/components/bills/paying-from-card";
import { ReceiptSheet } from "@/components/transactions/receipt-sheet";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { FieldError } from "@/components/ui/field-error";
import { FileDownloadIcon } from "@/components/ui/icons/file-download";
import { ResultSheet } from "@/components/ui/result-sheet";
import { useNgnAccount } from "@/hooks/use-ngn-account";
import {
  AIRTIME_AMOUNTS,
  AIRTIME_MAX,
  AIRTIME_MIN,
  DEFAULT_NETWORK,
  getNetwork,
} from "@/lib/bills";
import { friendlyBillError, readBillResponse } from "@/lib/bills-errors";
import type { Receipt } from "@/lib/receipt";
import { formatAmount } from "@/lib/transfer";
import { digitsOf, type FormErrors } from "@/lib/validation";

type Stage = "form" | "done";
type Sheet = "review" | "pin" | null;

/** Airtime top-up: number, amount and wallet on one screen, then review, PIN, receipt. */
export function AirtimeView() {
  const { hasNgnAccount, ngnBalance } = useNgnAccount();
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
  const [networkId, setNetworkId] = useState(DEFAULT_NETWORK);
  // The field holds the amount; a chip fills it and lights up while it matches.
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<FormErrors<BillField>>({});
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const network = getNetwork(networkId);
  const total = formatAmount(amount);
  /** Every printed amount in this flow is naira — one string so none can drift. */
  const naira = `₦${total}`;

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
    const friendly = friendlyBillError(rawOrMessage, "airtime");
    setFailure({
      title: overrideTitle ?? friendly.title,
      message: friendly.message,
      retry: overrideRetry ?? friendly.retry,
    });
  };

  const details = (
    <DetailList>
      <DetailRow label="From" value="Jumpa wallet" />
      <DetailRow label="Type" value="Airtime" />
      <DetailRow label="Network" value={network?.label ?? ""} />
      <DetailRow label="Phone number" value={phone} />
      <DetailRow label="Amount" value={naira} rule={false} />
    </DetailList>
  );

  const handlePinComplete = async (pin: string) => {
    if (!network || isProcessing) return;
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

    try {
      const res = await fetch("/api/v1/bills/airtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          amount: parseFloat(amount) || 0,
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
        else fail(data?.error || raw || "Airtime recharge failed");
        setIsProcessing(false);
        return;
      }

      // A 200 the provider still refused must not render a receipt.
      if (data?.success === false) {
        fail(data?.error ?? data?.message ?? "Airtime recharge failed");
        return;
      }

      setReceipt({
        reference: String(data?.reference ?? ""),
        title: "Airtime recharge",

        amount: naira,
        status: "Successful",
        timestamp: new Date().toLocaleString(),
        rows: [
          { label: "From", value: "Jumpa wallet" },
          { label: "Type", value: "Airtime" },
          { label: "Network", value: network.label },
          { label: "Phone number", value: phone },
          { label: "Amount", value: naira },
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

  if (stage === "done") {
    return (
      <TransferSuccess
        back="/airtime"
        title={`Airtime recharge of ${network?.label} to ${phone} was successful`}
        titleFirst
        actionsFirst
        amount={naira}
        details={details}
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

  const clear = (field: BillField) =>
    setErrors((current) => ({ ...current, [field]: undefined }));

  const checkAmount = (): string | undefined => {
    const value = Number(amount);
    if (!value) return "Choose or type an amount.";
    if (value < AIRTIME_MIN)
      return `The least you can buy is ₦${AIRTIME_MIN.toLocaleString("en-NG")}.`;
    if (value > AIRTIME_MAX)
      return `The most you can buy at once is ₦${AIRTIME_MAX.toLocaleString("en-NG")}.`;
    return undefined;
  };

  return (
    <>
      <BillForm
        title="Buy Airtime"
        phone={phone}
        network={networkId}
        errors={errors}
        complete={!checkAmount()}
        onPhoneChange={(next) => {
          clear("phone");
          setPhone(next);
        }}
        onNetworkChange={(next) => {
          clear("network");
          setNetworkId(next);
        }}
        onProceed={() => {
          const found = {
            ...checkRecipient(phone, networkId, hasNgnAccount),
            amount: checkAmount(),
          };
          setErrors(found);
          if (Object.values(found).some(Boolean)) return false;
          setSheet("review");
          return true;
        }}
      >
        <section className="mt-5.25 flex flex-col gap-2.5">
          <h2 className="text-[13px] leading-none font-medium text-jumpa-ink-muted">
            Amount
          </h2>
          <div className="flex flex-wrap gap-2">
            {AIRTIME_AMOUNTS.map((value) => (
              <BillChip
                key={value}
                active={amount === String(value)}
                onClick={() => {
                  clear("amount");
                  setAmount(String(value));
                }}
              >
                ₦{value.toLocaleString("en-NG")}
              </BillChip>
            ))}
          </div>
        </section>

        <label className="mt-5.75 flex flex-col gap-2">
          <span className="text-xs leading-none font-medium text-jumpa-ink-muted">
            Or type an amount
          </span>
          <span className="flex h-14 items-center rounded-panel bg-jumpa-neutral-50 px-4 text-sm leading-none text-jumpa-ink">
            ₦
            <input
              value={amount ? formatAmount(amount) : ""}
              onChange={(event) => {
                clear("amount");
                setAmount(digitsOf(event.target.value));
              }}
              inputMode="numeric"
              placeholder={`${AIRTIME_MIN}-${AIRTIME_MAX.toLocaleString("en-NG")}`}
              aria-invalid={Boolean(errors.amount)}
              className="min-w-0 flex-1 bg-transparent caret-jumpa-primary-600 outline-none placeholder:text-jumpa-ink-subtle"
            />
          </span>
          <FieldError>{errors.amount}</FieldError>
        </label>

        <div className="mt-7.5">
          <PayingFromCard balance={ngnBalance ?? "₦0.00"} />
        </div>
      </BillForm>

      {sheet === "review" && network ? (
        <ReviewSheet
          summary={
            <BillSummary
              label="Airtime recharge"
              phone={phone}
              network={network}
            />
          }
          headline={naira}
          onConfirm={() => setSheet("pin")}
          onClose={() => setSheet(null)}
        >
          {details}
        </ReviewSheet>
      ) : null}

      {sheet === "pin" ? (
        <TransferPinSheet
          error={pinError}
          pending={isProcessing}
          pendingLabel="Processing airtime recharge..."
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
