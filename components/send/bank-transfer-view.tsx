"use client";

import Image from "next/image";
import { useState } from "react";
import {
  type BankForm,
  BankTransferForm,
  EMPTY_BANK_FORM,
} from "@/components/send/bank-transfer-form";
import { AmountScreen } from "@/components/transfer/amount-screen";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { PairPill } from "@/components/transfer/pair-pill";
import { RecipientTag } from "@/components/transfer/recipient-tag";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { getAssetLogo } from "@/lib/assets";
import { COUNTRIES, DEMO_PIN, SEND_BALANCE } from "@/lib/transfer";
import type { Promotion } from "@/lib/wallet";

type Stage = "form" | "amount" | "done";
type Sheet = "review" | "pin" | null;

/** Bank and mobile-money transfers: recipient, amount, review, PIN, receipt. */
export function BankTransferView({ promotions }: { promotions: Promotion[] }) {
  const [stage, setStage] = useState<Stage>("form");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);
  const [form, setForm] = useState<BankForm>(EMPTY_BANK_FORM);
  const [amount, setAmount] = useState("");

  const country = COUNTRIES.find((entry) => entry.label === form.country);
  const currency = country?.currency ?? "USD";
  const { symbol, balance } = SEND_BALANCE;
  const momo = form.destination === "momo";

  // Routing and narration are only there for some rails, so the rule that
  // separates rows has to be decided against the rows actually rendered.
  const rows = momo
    ? [
        { label: "From", value: "Jumpa wallet" },
        { label: "Type", value: "Mobile money" },
        { label: "To", value: `${form.network} - ${form.phone}` },
        { label: "Recipient", value: form.name || "—" },
      ]
    : [
        { label: "From", value: "Jumpa wallet" },
        { label: "Type", value: country?.routing ? "ACH" : "Bank transfer" },
        { label: "To", value: `${form.bank} - ${form.account}` },
        { label: "Recipient", value: form.name || "—" },
        ...(form.routing ? [{ label: "Routing", value: form.routing }] : []),
        ...(form.note ? [{ label: "Narration", value: form.note }] : []),
      ];

  const details = (
    <DetailList>
      {rows.map((row, index) => (
        <DetailRow
          key={row.label}
          label={row.label}
          value={row.value}
          rule={index < rows.length - 1}
        />
      ))}
    </DetailList>
  );

  if (stage === "done") {
    return (
      <TransferSuccess
        back="/home"
        amount={`$${amount}`}
        note={
          <>
            Your money is on its way to{" "}
            <b className="font-bold">
              {form.name || (momo ? form.network : form.bank)}
            </b>
          </>
        }
        details={details}
        promotions={promotions}
      />
    );
  }

  if (stage === "amount") {
    return (
      <>
        <AmountScreen
          recipient={
            momo ? (
              <RecipientTag primary={form.phone} secondary={form.network} />
            ) : (
              <span className="truncate rounded-pill bg-jumpa-neutral-95 px-3 py-1 text-[10px] leading-4 font-medium text-jumpa-neutral-500">
                {form.bank} - {form.account}
              </span>
            )
          }
          onClose={() => setStage("form")}
          amount={amount}
          symbol={symbol}
          balance={balance}
          onAmountChange={setAmount}
          onReview={() => setSheet("review")}
        />

        {sheet === "review" ? (
          <ReviewSheet
            summary={
              <div className="flex items-center justify-between gap-3">
                <PairPill
                  left="Sending"
                  right={symbol}
                  media={
                    <Image
                      src={getAssetLogo(symbol)}
                      alt=""
                      width={20}
                      height={20}
                      className="size-5 rounded-full object-contain"
                    />
                  }
                />
                <RecipientTag
                  primary={momo ? form.phone : form.account}
                  secondary={
                    momo
                      ? `${form.network} - ${form.name}`
                      : `${form.bank} - ${form.name}`
                  }
                  align="right"
                />
              </div>
            }
            headline={`${amount} ${currency}`}
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
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader back="/send" title="Bank transfer" />
      <BankTransferForm
        form={form}
        onChange={setForm}
        onPickRecent={(account) =>
          setForm({
            ...form,
            destination: "bank",
            country: "Nigeria",
            account: account.number,
            bank: account.bank,
            name: account.name,
          })
        }
        onContinue={() => setStage("amount")}
      />
    </div>
  );
}
