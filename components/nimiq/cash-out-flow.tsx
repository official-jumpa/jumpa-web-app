"use client";

import Image from "next/image";
import { useState } from "react";
import type { Address } from "viem";
import { AmountScreen } from "@/components/transfer/amount-screen";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { PairPill } from "@/components/transfer/pair-pill";
import { RecipientTag } from "@/components/transfer/recipient-tag";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { FieldError } from "@/components/ui/field-error";
import { LoadingModal } from "@/components/ui/loading-modal";
import { ResultSheet } from "@/components/ui/result-sheet";
import { formatNaira, formatStable } from "@/lib/naira-deposit";
import { nimiqApi } from "@/lib/nimiq/api-client";
import { cashOutCeiling } from "@/lib/nimiq/limits";
import type { PublicOrder } from "@/lib/nimiq/order-status";
import type { AccountSummary } from "@/lib/nimiq/orders";
import type { Eip1193 } from "@/lib/nimiq/provider";
import type { SavedBank } from "@/lib/nimiq/recipients";
import {
  type BankDetails,
  CashOutBankForm,
  EMPTY_BANK_DETAILS,
} from "./cash-out-bank-form";
import { MINI_APP_PATH } from "./use-mini-app-nav";
import { primeOrder } from "./use-nimiq-order";
import { useNimiqQuote } from "./use-nimiq-quote";
import {
  type CheckoutStep,
  type PermitDraft,
  usePermitCheckout,
} from "./use-permit-checkout";

type Stage = "bank" | "amount";

const STEP_LABEL: Record<CheckoutStep, string> = {
  preparing: "Preparing your cash-out",
  signing: "Confirm in Nimiq Pay",
  sending: "Sending your USDT",
};

const CHIPS = [10, 25, 50, 100] as const;
/** USDT counts as dollars here, so amounts stop at cents like the limits do. */
const USD_DECIMALS = 2;
/** Quoted before anything is typed, so the amount screen can show a rate. */
const RATE_PROBE_USDT = 10;
/** A prepared order is reused only while this much signing time is left. */
const REUSE_MARGIN_MS = 30_000;

type Draft = PermitDraft & { key: string };

/** USDT on Polygon to a Nigerian bank: Nimiq Pay signs a permit, Jumpa pays the gas. */
export function CashOutFlow({
  provider,
  address,
  account,
  savedBanks,
  onLeave,
  onSubmitted,
  onOrderCreated,
}: {
  provider: Eip1193;
  address: Address;
  account?: AccountSummary;
  /** Accounts this device paid before, offered on the bank step. */
  savedBanks: SavedBank[];
  onLeave: () => void;
  /** The relay ran; show the order. `bank` is the account it pays, to remember. */
  onSubmitted: (order: PublicOrder, bank: SavedBank) => void;
  /** Recorded so a closed app can resume the order. */
  onOrderCreated: (orderId: string) => void;
}) {
  const [stage, setStage] = useState<Stage>("bank");
  const [bank, setBank] = useState<BankDetails>(EMPTY_BANK_DETAILS);
  const [amount, setAmount] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [draft, setDraft] = useState<Draft>();

  // The keypad can leave a trailing "." ("10."); the API wants a plain decimal.
  const settled = amount.replace(/\.$/, "");
  const entered = Number(settled) || 0;
  const {
    quote,
    perUsdt,
    error: quoteError,
  } = useNimiqQuote("cash_out", entered, RATE_PROBE_USDT);

  const balance = account?.usdtBalance ?? "0";
  const ceiling = account
    ? cashOutCeiling({
        balance,
        maxTxUsd: account.limits.maxTxUsd,
        remainingTodayUsd: account.remainingTodayUsd,
      })
    : "0";
  const maxUsd = account
    ? Math.min(account.limits.maxTxUsd, account.remainingTodayUsd)
    : undefined;

  /** Reuses the order prepared for this exact cash-out while it can still be signed. */
  const prepare = async (): Promise<Draft> => {
    const key = `${settled}|${bank.bank}|${bank.accountNumber}`;
    if (
      draft?.key === key &&
      draft.order.expiresAt &&
      Date.parse(draft.order.expiresAt) - Date.now() > REUSE_MARGIN_MS
    ) {
      return draft;
    }
    const created = await nimiqApi.createCashOut({
      address,
      amount: settled,
      bank: bank.bank,
      accountNumber: bank.accountNumber,
    });
    onOrderCreated(created.order.id);
    const next = { key, ...created };
    setDraft(next);
    return next;
  };

  const checkout = usePermitCheckout({
    provider,
    address,
    noun: "cash-out",
    submit: nimiqApi.submitCashOut,
    onDone: (order) => {
      primeOrder(order);
      onSubmitted(order, bank);
    },
    onExpired: () => setDraft(undefined),
  });
  const { step, failure, notice } = checkout;

  if (stage === "bank") {
    return (
      <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <TransferHeader
          back={MINI_APP_PATH}
          onBack={onLeave}
          title="Cash out"
        />
        <CashOutBankForm
          value={bank}
          saved={savedBanks}
          onChange={setBank}
          onContinue={() => setStage("amount")}
        />
      </div>
    );
  }

  const naira = quote ? formatNaira(quote.receive.amount) : undefined;

  return (
    <>
      <AmountScreen
        recipient={
          <RecipientTag
            primary={bank.accountName}
            secondary={`${bank.bankName} - ${bank.accountNumber}`}
          />
        }
        onClose={() => setStage("bank")}
        amount={amount}
        symbol="USDT"
        decimals={USD_DECIMALS}
        balance={formatStable(balance)}
        maxAmount={ceiling}
        chips={CHIPS}
        min={account?.limits.minUsd}
        max={maxUsd}
        limitUnit="$"
        rate={
          naira
            ? `≈ ${naira}`
            : perUsdt
              ? `1 USDT ≈ ${formatNaira(perUsdt)}`
              : (quoteError ?? "")
        }
        caption="Jumpa pays the Polygon network fee. You'll confirm in Nimiq Pay."
        onAmountChange={setAmount}
        onReview={() => {
          checkout.clearNotice();
          setReviewing(true);
        }}
      />

      {reviewing ? (
        <ReviewSheet
          summary={
            <div className="flex items-center justify-between gap-3">
              <PairPill
                left="Sending"
                right="USDT"
                media={
                  <Image
                    src="/coins/usdt.webp"
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 rounded-full object-contain"
                  />
                }
              />
              <RecipientTag
                primary={bank.accountNumber}
                secondary={`${bank.bankName} - ${bank.accountName}`}
                align="right"
              />
            </div>
          }
          headlineLabel="RECIPIENT GETS"
          headline={naira ?? "Getting a rate…"}
          headlineNote={`for ${formatStable(settled)} USDT`}
          confirmLabel="Confirm in Nimiq Pay"
          onConfirm={() => {
            if (quote && !step) void checkout.run(prepare);
          }}
          onClose={() => setReviewing(false)}
        >
          <DetailList>
            <DetailRow
              label="You send"
              value={`${formatStable(settled)} USDT`}
            />
            <DetailRow
              label="Rate"
              value={perUsdt ? `1 USDT ≈ ${formatNaira(perUsdt)}` : "…"}
            />
            <DetailRow label="Bank" value={bank.bankName} />
            <DetailRow label="Account name" value={bank.accountName} />
            <DetailRow label="Network fee" value="Paid by Jumpa" rule={false} />
          </DetailList>
          <FieldError>{notice ?? (quote ? undefined : quoteError)}</FieldError>
        </ReviewSheet>
      ) : null}

      {step ? <LoadingModal label={STEP_LABEL[step]} caption /> : null}

      {failure ? (
        <ResultSheet
          title="Cash-out didn't go through"
          message={failure.message}
          onRetry={failure.retry}
          onClose={checkout.dismissFailure}
        />
      ) : null}
    </>
  );
}
