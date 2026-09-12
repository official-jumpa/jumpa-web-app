"use client";

import { useEffect, useState } from "react";
import { PaymentSheet } from "@/components/receive/payment-sheet";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { assetOptions, QuoteLeg } from "@/components/transfer/quote-leg";
import { QuoteLockNote } from "@/components/transfer/quote-lock-note";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { ArrowDownArrowUpIcon } from "@/components/ui/icons/arrow-down-arrow-up";
import { LoadingModal } from "@/components/ui/loading-modal";
import { ScreenHeader } from "@/components/ui/screen-header";
import { getAssetLogo } from "@/lib/assets";
import {
  CONFIRMING_MS,
  DEFAULT_DEPOSIT_CURRENCY,
  DEFAULT_DEPOSIT_TOKEN,
  DEPOSIT_CURRENCIES,
  DEPOSIT_MINIMUM_USD,
  DEPOSIT_REFERENCE,
  DEPOSIT_TOKENS,
  depositInfo,
  QUOTE_LOCK_SECONDS,
  quoteDeposit,
} from "@/lib/fiat-deposit";
import { formatAmount, sanitiseAmount } from "@/lib/transfer";

const CURRENCY_OPTIONS = DEPOSIT_CURRENCIES.map(({ code, flag }) => ({
  value: code,
  label: code,
  icon: flag,
}));

const TOKEN_OPTIONS = assetOptions(DEPOSIT_TOKENS.map((token) => token.symbol));

type Side = { value: string; symbol: string; icon: string };

/** The picker only ever sets a code this list holds, but TS cannot know that. */
function flagFor(code: string) {
  return (
    DEPOSIT_CURRENCIES.find((entry) => entry.code === code) ??
    DEPOSIT_CURRENCIES[0]
  ).flag;
}

/** The quote as it stood when the user took it, so nothing behind the sheet
 *  can change what they were told to pay. */
type Order = { pay: Side; receive: Side; rate: string; fee: string };

type Stage = "quote" | "paying" | "confirming" | "done";

/** Buy crypto with fiat: take a quote, pay into an account, wait for it to land. */
export function FiatDepositView() {
  const [currency, setCurrency] = useState(DEFAULT_DEPOSIT_CURRENCY);
  const [symbol, setSymbol] = useState(DEFAULT_DEPOSIT_TOKEN);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();
  const [stage, setStage] = useState<Stage>("quote");
  const [order, setOrder] = useState<Order | null>(null);

  const quote = quoteDeposit(amount, currency, symbol);

  // Stands in for polling the rail. Nothing confirms a transfer yet.
  useEffect(() => {
    if (stage !== "confirming") return;
    const timer = setTimeout(() => setStage("done"), CONFIRMING_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  const buy = () => {
    if (!quote) {
      setError("Enter an amount to deposit");
      return;
    }
    if (quote.usd < DEPOSIT_MINIMUM_USD) {
      setError(`The minimum deposit is $${DEPOSIT_MINIMUM_USD}`);
      return;
    }

    setError(undefined);
    setOrder({
      pay: {
        value: formatAmount(amount),
        symbol: currency,
        icon: flagFor(currency),
      },
      receive: { value: quote.receive, symbol, icon: getAssetLogo(symbol) },
      rate: quote.rate,
      fee: quote.fee,
    });
    setStage("paying");
  };

  if (stage === "done" && order) {
    return (
      <TransferSuccess
        back="/home"
        title="Deposit received"
        amount={`+${order.receive.value} ${order.receive.symbol}`}
        titleFirst
        details={
          <DetailList tone="secondary">
            <DetailRow
              label="You paid"
              value={`${order.pay.value} ${order.pay.symbol}`}
            />
            <DetailRow label="Rate" value={order.rate} />
            <DetailRow label="Fee" value={order.fee} />
            <DetailRow
              label="Reference"
              value={DEPOSIT_REFERENCE}
              rule={false}
            />
          </DetailList>
        }
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back="/receive" title="Deposit fiat" round />

      <div className="mt-4 flex flex-col gap-6">
        <div className="relative flex flex-col gap-1">
          <QuoteLeg
            label="You send"
            tone="neutral"
            symbol={currency}
            options={CURRENCY_OPTIONS}
            onSymbolChange={setCurrency}
          >
            <input
              value={formatAmount(amount)}
              onChange={(event) => {
                setError(undefined);
                setAmount(sanitiseAmount(event.target.value));
              }}
              inputMode="decimal"
              aria-label="Amount to deposit"
              placeholder="0"
              className="w-full min-w-0 bg-transparent text-xl leading-6 font-medium text-jumpa-black caret-jumpa-primary-600 outline-none"
            />
          </QuoteLeg>

          {/* A deposit runs one way, so the disc marks the direction rather
              than flipping it — same call as the chat's bridge card. */}
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 flex size-8.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[0.66px] border-jumpa-black/10 bg-jumpa-primary-525 text-jumpa-alt-400 shadow-jumpa-disc"
          >
            <ArrowDownArrowUpIcon className="size-4" />
          </span>

          <QuoteLeg
            label="You receive"
            tone="neutral"
            symbol={symbol}
            options={TOKEN_OPTIONS}
            onSymbolChange={setSymbol}
          >
            <span className="text-xl leading-6 font-medium text-jumpa-black">
              {quote?.receive ?? "0"}
            </span>
          </QuoteLeg>
        </div>

        <p className="flex items-center justify-between gap-3 px-2.5 text-xs leading-4 text-jumpa-black/50">
          <span>
            Rate{" "}
            <b className="font-bold text-jumpa-black">{quote?.rate ?? "—"}</b>
          </span>
          <span>
            Fee <b className="font-bold text-jumpa-black">{quote?.fee ?? "—"}</b>
          </span>
        </p>

        <div className="flex flex-col items-center gap-3">
          <FieldError>{error}</FieldError>
          <Button variant="gradient" size="lg" onClick={buy}>
            Buy crypto
          </Button>
        </div>

        <QuoteLockNote seconds={QUOTE_LOCK_SECONDS} />

        <section className="flex flex-col gap-3">
          <h2 className="text-xs leading-5 font-semibold text-jumpa-black">
            Deposit info
          </h2>
          <ul className="flex flex-col rounded-surface bg-jumpa-primary-50 p-4 text-xs leading-5 font-semibold text-jumpa-black">
            {depositInfo(symbol).map((line) => (
              <li key={line} className="flex gap-0.5">
                <span aria-hidden="true">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {stage === "paying" && order ? (
        <PaymentSheet
          pay={order.pay}
          receive={order.receive}
          onConfirm={() => setStage("confirming")}
          onClose={() => setStage("quote")}
        />
      ) : null}

      {stage === "confirming" ? (
        <LoadingModal label="Confirming your payment" />
      ) : null}
    </div>
  );
}
