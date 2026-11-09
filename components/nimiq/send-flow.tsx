"use client";

import Image from "next/image";
import { useState } from "react";
import { type Address, getAddress, isAddressEqual } from "viem";
import { RecipientStep } from "@/components/send/jumpa/recipient-step";
import { SettingsHeader } from "@/components/settings/settings-header";
import { AmountScreen } from "@/components/transfer/amount-screen";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { FIELD_INPUT, Field, PasteAction } from "@/components/transfer/field";
import { OptionRow } from "@/components/transfer/option-row";
import { PairPill } from "@/components/transfer/pair-pill";
import { RecipientTag } from "@/components/transfer/recipient-tag";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { CircleInformationIcon } from "@/components/ui/icons/circle-information";
import { WalletIcon } from "@/components/ui/icons/wallet";
import { LoadingModal } from "@/components/ui/loading-modal";
import { ResultSheet } from "@/components/ui/result-sheet";
import { formatStable } from "@/lib/naira-deposit";
import { nimiqApi } from "@/lib/nimiq/api-client";
import { cashOutCeiling } from "@/lib/nimiq/limits";
import type { PublicOrder } from "@/lib/nimiq/order-status";
import type { AccountSummary } from "@/lib/nimiq/orders";
import type { Eip1193 } from "@/lib/nimiq/provider";
import { walletAddressError } from "@/lib/nimiq/recipients";
import { shortenAddress } from "@/lib/transfer";
import { MINI_APP_PATH } from "./use-mini-app-nav";
import { primeOrder } from "./use-nimiq-order";
import { type TagMatch, useTagLookup } from "./use-nimiq-tag";
import {
  type CheckoutStep,
  type PermitDraft,
  usePermitCheckout,
} from "./use-permit-checkout";

type Stage = "address" | "amount";

const NO_MATCH = "No Nimiq Pay user has that tag yet.";

const STEP_LABEL: Record<CheckoutStep, string> = {
  preparing: "Preparing your transfer",
  signing: "Confirm in Nimiq Pay",
  sending: "Sending your USDT",
};

const CHIPS = [10, 25, 50, 100] as const;
/** USDT counts as dollars here, so amounts stop at cents like the limits do. */
const USD_DECIMALS = 2;
/** A prepared order is reused only while this much signing time is left. */
const REUSE_MARGIN_MS = 30_000;

const short = (address: string) => shortenAddress(address, 6, 4);

type Draft = PermitDraft & { key: string };

/** USDT on Polygon to another Polygon wallet, by address or Jumpa tag: Nimiq Pay signs a permit, Jumpa pays the gas. */
export function SendFlow({
  by = "address",
  provider,
  address,
  account,
  savedWallets,
  onLeave,
  onSubmitted,
  onOrderCreated,
}: {
  /** How the recipient is picked: a pasted address, or a Nimiq Pay user's Jumpa tag. */
  by?: "address" | "tag";
  provider: Eip1193;
  address: Address;
  account?: AccountSummary;
  /** Wallets this device paid before, offered on the address step. */
  savedWallets: string[];
  onLeave: () => void;
  /** The relay ran; show the order. `to` is the wallet it pays, to remember. */
  onSubmitted: (order: PublicOrder, to: Address) => void;
  /** Recorded so a closed app can resume the order. */
  onOrderCreated: (orderId: string) => void;
}) {
  const [stage, setStage] = useState<Stage>("address");
  const [to, setTo] = useState<Address>();
  const [tag, setTag] = useState<string>();
  const [amount, setAmount] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [draft, setDraft] = useState<Draft>();

  // The keypad can leave a trailing "." ("10."); the API wants a plain decimal.
  const settled = amount.replace(/\.$/, "");

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

  /** Reuses the order prepared for this exact transfer while it can still be signed. */
  const prepare = async (): Promise<Draft> => {
    if (!to) throw new Error("No recipient chosen");
    const key = `${settled}|${to}`;
    if (
      draft?.key === key &&
      draft.order.expiresAt &&
      Date.parse(draft.order.expiresAt) - Date.now() > REUSE_MARGIN_MS
    ) {
      return draft;
    }
    const created = await nimiqApi.createSend({ address, to, amount: settled });
    onOrderCreated(created.order.id);
    const next = { key, ...created };
    setDraft(next);
    return next;
  };

  const checkout = usePermitCheckout({
    provider,
    address,
    noun: "transfer",
    submit: nimiqApi.submitSend,
    onDone: (order) => {
      primeOrder(order);
      if (to) onSubmitted(order, to);
    },
    onExpired: () => setDraft(undefined),
  });
  const { step, failure, notice } = checkout;

  if ((stage === "address" || !to) && by === "tag") {
    return (
      <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <SettingsHeader size="lg" title="Send to Jumpa user" onBack={onLeave} />
        <SendTagForm
          own={address}
          initial={tag}
          onContinue={(match) => {
            setTo(match.address);
            setTag(match.tag);
            setStage("amount");
          }}
        />
      </div>
    );
  }

  if (stage === "address" || !to) {
    return (
      <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <TransferHeader back={MINI_APP_PATH} onBack={onLeave} title="Send" />
        <SendAddressForm
          own={address}
          initial={to}
          saved={savedWallets}
          onContinue={(wallet) => {
            setTo(wallet);
            setStage("amount");
          }}
        />
      </div>
    );
  }

  const usdt = `${formatStable(settled)} USDT`;
  const name = tag ?? short(to);

  return (
    <>
      <AmountScreen
        recipient={<RecipientTag primary={name} secondary="Polygon" />}
        onClose={() => setStage("address")}
        amount={amount}
        symbol="USDT"
        decimals={USD_DECIMALS}
        balance={formatStable(balance)}
        maxAmount={ceiling}
        chips={CHIPS}
        min={account?.limits.minUsd}
        max={maxUsd}
        limitUnit="$"
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
              <RecipientTag primary={name} secondary="Polygon" align="right" />
            </div>
          }
          headlineLabel="RECIPIENT GETS"
          headline={usdt}
          headlineNote="on Polygon"
          confirmLabel="Confirm in Nimiq Pay"
          onConfirm={() => {
            if (!step) void checkout.run(prepare);
          }}
          onClose={() => setReviewing(false)}
        >
          <DetailList>
            <DetailRow label="You send" value={usdt} />
            {tag ? <DetailRow label="Jumpa tag" value={tag} /> : null}
            <DetailRow label="To wallet" value={short(to)} />
            <DetailRow label="Network" value="Polygon" />
            <DetailRow label="Network fee" value="Paid by Jumpa" rule={false} />
          </DetailList>
          <FieldError>{notice}</FieldError>
        </ReviewSheet>
      ) : null}

      {step ? <LoadingModal label={STEP_LABEL[step]} caption /> : null}

      {failure ? (
        <ResultSheet
          title="Transfer didn't go through"
          message={failure.message}
          onRetry={failure.retry}
          onClose={checkout.dismissFailure}
        />
      ) : null}
    </>
  );
}

/** The recipient step: paste a Polygon address or pick one paid before. */
function SendAddressForm({
  own,
  initial,
  saved,
  onContinue,
}: {
  own: Address;
  initial?: Address;
  saved: string[];
  onContinue: (wallet: Address) => void;
}) {
  const [draft, setDraft] = useState<string>(initial ?? "");
  const [showError, setShowError] = useState(false);
  const trimmed = draft.trim();
  const problem =
    walletAddressError(trimmed) ??
    (isAddressEqual(getAddress(trimmed), own)
      ? "That's the wallet you're sending from."
      : undefined);
  const others = saved.filter(
    (wallet) => !isAddressEqual(wallet as Address, own),
  );

  const submit = () => {
    setShowError(true);
    if (!problem) onContinue(getAddress(trimmed));
  };

  return (
    <div className="flex flex-1 flex-col gap-5 pt-6">
      {!trimmed && others.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs leading-5 font-medium text-jumpa-black">
            Recent wallets
          </h2>
          <ul className="flex flex-col gap-4 rounded-surface bg-jumpa-primary-50 px-4 py-4">
            {others.map((wallet) => (
              <li key={wallet}>
                <OptionRow
                  Icon={WalletIcon}
                  title={short(wallet)}
                  caption="Polygon"
                  onClick={() => onContinue(getAddress(wallet))}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Field
        label="Polygon wallet address"
        error={showError ? problem : undefined}
      >
        <input
          value={draft}
          onChange={(event) => {
            setShowError(false);
            setDraft(event.target.value);
          }}
          placeholder="0x…"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={showError && Boolean(problem)}
          className={FIELD_INPUT}
        />
        <PasteAction onPaste={(text) => setDraft(text.trim())} />
      </Field>

      <p className="flex items-center gap-2 rounded-surface bg-jumpa-primary-50 px-3 py-3.5">
        <CircleInformationIcon
          aria-hidden="true"
          className="size-5 shrink-0 text-jumpa-primary-600"
        />
        <span className="text-xs leading-4 font-medium text-jumpa-primary-600">
          Polygon wallets only. USDT sent to a wrong address can&rsquo;t be
          recovered.
        </span>
      </p>

      <Button variant="gradient" size="lg" className="mt-auto" onClick={submit}>
        Continue
      </Button>
    </div>
  );
}

/** The recipient step by tag: the main app's lookup screen, matching Nimiq Pay users' tags only. */
function SendTagForm({
  own,
  initial,
  onContinue,
}: {
  own: Address;
  initial?: string;
  onContinue: (match: TagMatch) => void;
}) {
  const [query, setQuery] = useState(initial ?? "");
  const [error, setError] = useState<string>();
  const lookup = useTagLookup(query);
  const { match } = lookup;
  const mine = match ? isAddressEqual(match.address, own) : false;
  const usable = match && !mine ? match : undefined;

  return (
    <RecipientStep
      query={query}
      onQueryChange={(value) => {
        setQuery(value);
        setError(undefined);
      }}
      status={lookup.status}
      recipients={
        usable
          ? [
              {
                name: usable.handle,
                tag: usable.handle,
                image: null,
                addresses: {},
              },
            ]
          : []
      }
      error={error ?? (mine ? "That's your own Jumpa tag." : undefined)}
      prompt="Enter the Jumpa tag of the Nimiq Pay user you're paying."
      fieldLabel="Recipient Jumpa tag"
      hints={{ none: NO_MATCH }}
      onPick={() => usable && onContinue(usable)}
      onContinue={() => {
        if (usable) onContinue(usable);
        else if (lookup.status !== "searching" && !mine) {
          setError(
            lookup.status === "error"
              ? "Couldn't check that tag right now. Try again."
              : NO_MATCH,
          );
        }
      }}
    />
  );
}
