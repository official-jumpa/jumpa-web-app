"use client";

import { useState } from "react";
import type { Address } from "viem";
import {
  AirtimeAmount,
  airtimeAmountError,
} from "@/components/bills/airtime-amount";
import {
  type BillField,
  BillForm,
  checkRecipient,
} from "@/components/bills/bill-form";
import { BillSummary } from "@/components/bills/bill-review";
import { DataPlanPicker } from "@/components/bills/data-plan-picker";
import { PayingFromCard } from "@/components/bills/paying-from-card";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { FieldError } from "@/components/ui/field-error";
import { LoadingModal } from "@/components/ui/loading-modal";
import { ResultSheet } from "@/components/ui/result-sheet";
import {
  type DataPlan,
  DEFAULT_NETWORK,
  getNetwork,
  getPeriodLabel,
} from "@/lib/bills";
import { formatNaira, formatStable } from "@/lib/naira-deposit";
import { nimiqApi } from "@/lib/nimiq/api-client";
import { BILL_RATE_PROBE_USDT } from "@/lib/nimiq/constants";
import type { BillDirection, PublicOrder } from "@/lib/nimiq/order-status";
import type { AccountSummary } from "@/lib/nimiq/orders";
import type { Eip1193 } from "@/lib/nimiq/provider";
import type { FormErrors } from "@/lib/validation";
import { MINI_APP_PATH } from "./use-mini-app-nav";
import { primeOrder } from "./use-nimiq-order";
import { useNimiqQuote } from "./use-nimiq-quote";
import { type CheckoutStep, usePermitCheckout } from "./use-permit-checkout";

const COPY: Record<
  BillDirection,
  { title: string; summary: string; type: string; buying: string }
> = {
  airtime: {
    title: "Buy Airtime",
    summary: "Airtime recharge",
    type: "Airtime",
    buying: "Buying your airtime",
  },
  data: {
    title: "Mobile Data",
    summary: "Data purchase",
    type: "Data",
    buying: "Buying your data",
  },
};

const WALLET = "USDT on Polygon";
const PLANS_URL = "/api/v1/nimiq/data-plans";

/** USDT this many Naira costs at the rate, rounded up to the cent like the server. */
const usdtFor = (naira: number, perUsdt: number) =>
  Math.ceil((naira / perUsdt) * 100) / 100;

/** The main app's airtime and data screens, paid with USDT that Nimiq Pay approves. */
export function BillFlow({
  kind,
  provider,
  address,
  account,
  onLeave,
  onSubmitted,
  onOrderCreated,
}: {
  kind: BillDirection;
  provider: Eip1193;
  address: Address;
  account?: AccountSummary;
  onLeave: () => void;
  /** The USDT moved; show the order. */
  onSubmitted: (order: PublicOrder) => void;
  /** Recorded so a closed app can resume the order. */
  onOrderCreated: (orderId: string) => void;
}) {
  const copy = COPY[kind];
  const [phone, setPhone] = useState("");
  const [networkId, setNetworkId] = useState(DEFAULT_NETWORK);
  const [amount, setAmount] = useState("");
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [errors, setErrors] = useState<FormErrors<BillField>>({});
  const [reviewing, setReviewing] = useState(false);
  const { perUsdt, error: rateError } = useNimiqQuote(
    "cash_out",
    0,
    BILL_RATE_PROBE_USDT,
  );

  const checkout = usePermitCheckout({
    provider,
    address,
    noun: "purchase",
    submit: nimiqApi.submitBill,
    onDone: (order) => {
      primeOrder(order);
      onSubmitted(order);
    },
  });
  const { step, failure, notice } = checkout;

  const network = getNetwork(networkId);
  const naira = kind === "airtime" ? Number(amount) || 0 : plan?.numericPrice;
  const usdt = naira && perUsdt ? usdtFor(naira, perUsdt) : undefined;
  const balance = account?.usdtBalance ?? "0";
  const field: BillField = kind === "airtime" ? "amount" : "plan";

  const clear = (key: BillField) =>
    setErrors((current) => ({ ...current, [key]: undefined }));

  const choiceError = () => {
    const missing =
      kind === "airtime"
        ? airtimeAmountError(amount)
        : plan
          ? undefined
          : "Select a data plan to continue.";
    if (missing) return missing;
    return usdt && usdt > Number(balance)
      ? "Your USDT balance is too low for this."
      : undefined;
  };

  const prepare = async () => {
    const recipient = { address, phone, network: networkId };
    const created = await nimiqApi.createBill(
      kind === "airtime"
        ? { ...recipient, kind, amountNgn: Number(amount) }
        : { ...recipient, kind, productName: plan?.productName ?? "" },
    );
    onOrderCreated(created.order.id);
    return created;
  };

  const stepLabel: Record<CheckoutStep, string> = {
    preparing: "Preparing your purchase",
    signing: "Confirm in Nimiq Pay",
    sending: copy.buying,
  };
  const pay = usdt ? `≈ ${formatStable(usdt)} USDT` : "…";
  const headline =
    kind === "data" && plan
      ? `${plan.price} (${plan.size}-${getPeriodLabel(plan.period)})`
      : formatNaira(naira ?? 0);

  return (
    <>
      <BillForm
        title={copy.title}
        back={MINI_APP_PATH}
        onBack={onLeave}
        phone={phone}
        network={networkId}
        errors={errors}
        complete={!choiceError()}
        onPhoneChange={(next) => {
          clear("phone");
          setPhone(next);
          setPlan(null);
        }}
        onNetworkChange={(next) => {
          clear("network");
          setNetworkId(next);
        }}
        onProceed={() => {
          const found = {
            ...checkRecipient(phone, networkId, true),
            [field]: choiceError(),
          };
          setErrors(found);
          if (Object.values(found).some(Boolean)) return false;
          checkout.clearNotice();
          setReviewing(true);
          return true;
        }}
      >
        {kind === "airtime" ? (
          <>
            <AirtimeAmount
              amount={amount}
              error={errors.amount}
              onChange={(next) => {
                clear("amount");
                setAmount(next);
              }}
            />
            <div className="mt-7.5">
              <PayingFromCard
                wallet={WALLET}
                balance={`${formatStable(balance)} USDT`}
              />
            </div>
          </>
        ) : (
          <DataPlanPicker
            phone={phone}
            selected={plan}
            error={errors.plan}
            onSelect={(next) => {
              clear("plan");
              setPlan(next);
            }}
            onNetworkDetected={setNetworkId}
            plansUrl={PLANS_URL}
          />
        )}
        <p className="mt-3 text-xs leading-4 text-jumpa-neutral-400">
          {perUsdt
            ? `1 USDT ≈ ${formatNaira(perUsdt)}. Jumpa pays the network fee; you'll confirm in Nimiq Pay.`
            : (rateError ?? "Getting today's rate…")}
        </p>
      </BillForm>

      {reviewing && network ? (
        <ReviewSheet
          summary={
            <BillSummary label={copy.summary} phone={phone} network={network} />
          }
          headline={headline}
          headlineNote={`${pay} from your wallet`}
          confirmLabel="Confirm in Nimiq Pay"
          onConfirm={() => {
            if (usdt && !step) void checkout.run(prepare);
          }}
          onClose={() => setReviewing(false)}
        >
          <DetailList>
            <DetailRow label="From" value={WALLET} />
            <DetailRow label="Type" value={copy.type} />
            <DetailRow label="Network" value={network.label} />
            <DetailRow label="Phone number" value={phone} />
            {kind === "data" && plan ? (
              <DetailRow label="Plan" value={plan.validity} />
            ) : null}
            <DetailRow label="Amount" value={formatNaira(naira ?? 0)} />
            <DetailRow label="You pay" value={pay} />
            <DetailRow label="Network fee" value="Paid by Jumpa" rule={false} />
          </DetailList>
          <FieldError>{notice ?? (usdt ? undefined : rateError)}</FieldError>
        </ReviewSheet>
      ) : null}

      {step ? <LoadingModal label={stepLabel[step]} caption /> : null}

      {failure ? (
        <ResultSheet
          title="Purchase didn't go through"
          message={failure.message}
          onRetry={failure.retry}
          onClose={checkout.dismissFailure}
        />
      ) : null}
    </>
  );
}
