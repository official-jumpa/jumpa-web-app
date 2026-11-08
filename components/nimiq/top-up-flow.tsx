"use client";

import Image from "next/image";
import { useState } from "react";
import type { Address } from "viem";
import { AmountScreen } from "@/components/transfer/amount-screen";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { PairPill } from "@/components/transfer/pair-pill";
import { RecipientTag } from "@/components/transfer/recipient-tag";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { FieldError } from "@/components/ui/field-error";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { LoadingModal } from "@/components/ui/loading-modal";
import { ResultSheet } from "@/components/ui/result-sheet";
import { formatNaira, formatStable } from "@/lib/naira-deposit";
import { type NimiqApiError, nimiqApi } from "@/lib/nimiq/api-client";
import { topUpBounds } from "@/lib/nimiq/limits";
import type { PublicOrder } from "@/lib/nimiq/order-status";
import type { AccountSummary } from "@/lib/nimiq/orders";
import { shortenAddress } from "@/lib/transfer";
import { TopUpRecipientSheet } from "./top-up-recipient-sheet";
import { primeOrder } from "./use-nimiq-order";
import { useNimiqQuote } from "./use-nimiq-quote";

const CHIPS = [5_000, 10_000, 20_000, 50_000] as const;
/** Quoted before anything is typed, so the amount screen can show a rate. */
const RATE_PROBE_NGN = 10_000;
/** Switch takes whole Naira. */
const NAIRA_DECIMALS = 0;

type Failure = { message: string; retry?: () => void };

/** Naira by bank transfer to USDT on Polygon, paid into the Nimiq Pay wallet or another one. */
export function TopUpFlow({
  address,
  account,
  savedWallets,
  onLeave,
  onCreated,
}: {
  address: Address;
  account?: AccountSummary;
  /** Other wallets this device topped up before. */
  savedWallets: string[];
  onLeave: () => void;
  /** The deposit account is ready; show the order. `recipient` is set for another wallet. */
  onCreated: (order: PublicOrder, recipient?: Address) => void;
}) {
  const [amount, setAmount] = useState("");
  /** Undefined pays the connected wallet. */
  const [recipient, setRecipient] = useState<Address>();
  const [choosing, setChoosing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [failure, setFailure] = useState<Failure>();

  // The keypad can leave a trailing "." ("5000."); the API wants a whole number.
  const naira = Number(amount.replace(/\.$/, "")) || 0;
  const {
    quote,
    perUsdt,
    error: quoteError,
  } = useNimiqQuote("top_up", naira, RATE_PROBE_NGN);
  const bounds =
    account && perUsdt
      ? topUpBounds({
          minUsd: account.limits.minUsd,
          maxTxUsd: account.limits.maxTxUsd,
          remainingTodayUsd: account.remainingTodayUsd,
          perUsdt,
        })
      : undefined;
  const usdt = quote ? `${formatStable(quote.receive.amount)} USDT` : undefined;
  const payee = recipient
    ? { primary: "Another wallet", secondary: shortenAddress(recipient, 6, 4) }
    : { primary: "Your wallet", secondary: shortenAddress(address, 6, 4) };

  const create = async () => {
    setCreating(true);
    try {
      const { order } = await nimiqApi.createTopUp({
        address,
        amountNgn: naira,
        recipient,
      });
      primeOrder(order);
      onCreated(order, recipient);
    } catch (error) {
      const status = (error as NimiqApiError).status ?? 0;
      setFailure({
        message: (error as Error).message,
        retry:
          status === 0 || status >= 500
            ? () => {
                setFailure(undefined);
                void create();
              }
            : undefined,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <AmountScreen
        recipient={
          <button
            type="button"
            onClick={() => setChoosing(true)}
            aria-label={`Send the USDT to ${payee.secondary}. Change wallet`}
            className="tap flex min-w-0 items-center gap-1 active:scale-95"
          >
            <RecipientTag primary={payee.primary} secondary={payee.secondary} />
            <ChevronDownIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-jumpa-primary-600"
            />
          </button>
        }
        onClose={onLeave}
        amount={amount}
        // The line under the amount shows the wallet's USDT, not a Naira balance.
        symbol="USDT"
        balance={formatStable(account?.usdtBalance ?? "0")}
        checkBalance={false}
        decimals={NAIRA_DECIMALS}
        inputPrefix="₦"
        chips={CHIPS}
        chipUnit=""
        min={bounds?.min}
        max={bounds?.max}
        limitUnit="₦"
        rate={
          usdt
            ? `≈ ${usdt}`
            : perUsdt
              ? `1 USDT ≈ ${formatNaira(perUsdt)}`
              : (quoteError ?? "")
        }
        caption={
          recipient
            ? `Pay by bank transfer. The USDT lands in wallet ${payee.secondary} on Polygon.`
            : "Pay by bank transfer. The USDT lands in your Nimiq Pay wallet on Polygon."
        }
        onAmountChange={setAmount}
        onReview={() => setReviewing(true)}
      />

      {reviewing ? (
        <ReviewSheet
          summary={
            <div className="flex items-center justify-between gap-3">
              <PairPill
                left="Paying"
                right="NGN"
                media={
                  <Image
                    src="/images/flags/ng.png"
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 rounded-full object-cover"
                  />
                }
              />
              <RecipientTag
                primary={payee.primary}
                secondary={payee.secondary}
                align="right"
              />
            </div>
          }
          headlineLabel="YOU GET"
          headline={usdt ?? "Getting a rate…"}
          headlineNote={`for ${formatNaira(naira)}`}
          confirmLabel="Get account details"
          onConfirm={() => {
            if (quote && !creating) void create();
          }}
          onClose={() => setReviewing(false)}
        >
          <DetailList>
            <DetailRow label="You pay" value={formatNaira(naira)} />
            <DetailRow
              label="Rate"
              value={perUsdt ? `1 USDT ≈ ${formatNaira(perUsdt)}` : "…"}
            />
            <DetailRow label="Network" value="Polygon" />
            <DetailRow label="To" value={payee.secondary} rule={false} />
          </DetailList>
          <FieldError>{quote ? undefined : quoteError}</FieldError>
        </ReviewSheet>
      ) : null}

      {choosing ? (
        <TopUpRecipientSheet
          own={address}
          current={recipient}
          saved={savedWallets}
          onPick={(next) => {
            setRecipient(next);
            setChoosing(false);
          }}
          onClose={() => setChoosing(false)}
        />
      ) : null}

      {creating ? (
        <LoadingModal label="Getting your account details" caption />
      ) : null}

      {failure ? (
        <ResultSheet
          title="Top-up didn't start"
          message={failure.message}
          onRetry={failure.retry}
          onClose={() => setFailure(undefined)}
        />
      ) : null}
    </>
  );
}
