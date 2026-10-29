"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { SettingsHeader } from "@/components/settings/settings-header";
import { AssetSheet } from "@/components/send/jumpa/asset-sheet";
import { type AmountField, JumpaAmountForm } from "@/components/send/jumpa/jumpa-amount-form";
import { RecipientStep } from "@/components/send/jumpa/recipient-step";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { PairPill } from "@/components/transfer/pair-pill";
import { RecipientTag } from "@/components/transfer/recipient-tag";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { ResultSheet } from "@/components/ui/result-sheet";
import { useFiatRates } from "@/hooks/use-fiat-rates";
import { useRecipientLookup } from "@/hooks/use-recipient-lookup";
import { findHolding, useWalletTokens } from "@/hooks/use-wallet-tokens";
import { invalidateClientBalances } from "@/lib/client-events";
import { errorMessage, type FriendlyError, friendlyError } from "@/lib/errors";
import {
  clampNarration,
  DEFAULT_SEND_ASSET,
  decimalsForAsset,
  formatAssetAmount,
  type JumpaRecipient,
  perUsd,
  rateLabel,
  type SendAsset,
  settlementAmount,
} from "@/lib/jumpa-send";
import { usdEquivalent } from "@/lib/token-amount";
import { formatAmount, NETWORK_CONFIGS, sanitiseAmount } from "@/lib/transfer";
import { type FormErrors, revealFirstError } from "@/lib/validation";

type Stage = "recipient" | "amount" | "done";
type Sheet = "asset" | "review" | "pin" | null;

const TITLE = "Send to Jumpa user";

const SCREEN =
  "flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]";

/** Pay another Jumpa user by tag, phone, email or address: who, how much, review, PIN, receipt. */
export function JumpaSendView() {
  const [stage, setStage] = useState<Stage>("recipient");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [query, setQuery] = useState("");
  const [recipient, setRecipient] = useState<JumpaRecipient | null>(null);
  const [recipientError, setRecipientError] = useState<string>();
  const [asset, setAsset] = useState<SendAsset>(DEFAULT_SEND_ASSET);
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");
  const [errors, setErrors] = useState<FormErrors<AmountField>>({});
  const [pinError, setPinError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<FriendlyError>();
  const formRef = useRef<HTMLDivElement>(null);

  const lookup = useRecipientLookup(query);
  const { tokens, ready } = useWalletTokens();
  const rates = useFiatRates(asset.kind === "fiat");

  const holding = findHolding(tokens, asset.token, asset.chain);
  const typed = Number(amount) || 0;
  const settlement = settlementAmount(asset, typed, rates);
  const rate = perUsd(asset, rates);
  const config = NETWORK_CONFIGS[asset.network];

  // Fiat is priced off the USDC it settles as, so the balance reads in the picked currency.
  const spendable = holding?.spendable ?? 0;
  const balance = !ready
    ? "—"
    : asset.kind === "crypto"
      ? formatAssetAmount(asset, spendable)
      : rate
        ? formatAssetAmount(asset, spendable * rate)
        : "—";

  const settlesAs =
    asset.kind === "fiat" && settlement !== null
      ? `${formatAmount(String(settlement))} ${asset.token}`
      : undefined;
  const note =
    asset.kind === "crypto" ? usdEquivalent(typed, holding?.priceUsd) : asset.code === "USD" ? undefined : settlesAs && `Arrives as ${settlesAs}`;

  const pickRecipient = (picked: JumpaRecipient) => {
    setRecipientError(undefined);
    setRecipient(picked);
    setStage("amount");
  };

  // Continue goes through on a single match; with several, the user picks one.
  const continueFromRecipient = () => {
    const [only, ...rest] = lookup.recipients;
    if (only && rest.length === 0) return pickRecipient(only);
    setRecipientError(
      only
        ? "Pick who you are sending to from the list."
        : query.trim()
          ? "Wait for a matching Jumpa user, or check what you typed."
          : "Enter who you are sending to.",
    );
  };

  const continueFromAmount = () => {
    const next: FormErrors<AmountField> = {};
    if (!(typed > 0)) next.amount = "Enter an amount to send.";
    else if (settlement === null) next.amount = "Rates are still loading. Try again in a moment.";
    else if (ready && settlement > spendable) next.amount = `You have ${balance} available.`;
    else if (!recipient?.addresses[asset.chain]) {
      next.amount = `${recipient?.name ?? "This user"} can't receive ${asset.code} yet. Pick another currency.`;
    }
    setErrors(next);
    if (Object.keys(next).length) {
      revealFirstError(formRef.current);
      return;
    }
    setSheet("review");
  };

  // A rejected PIN stays in the sheet to be retyped; anything else ends the attempt.
  const fail = (raw?: string) => {
    setFailure(friendlyError(raw, "transfer"));
    setSheet(null);
  };

  const send = async (pin: string) => {
    if (!recipient || settlement === null) return;
    setSubmitting(true);
    setPinError(false);
    try {
      const res = await fetch("/api/v1/wallet/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: recipient.addresses[asset.chain],
          amount: String(settlement),
          asset: asset.token,
          network: asset.network,
          memo: narration.trim() || undefined,
          pin,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        if (res.status === 401 && json.error?.toLowerCase().includes("pin")) setPinError(true);
        else fail(json.error);
        return;
      }
      invalidateClientBalances();
      setSheet(null);
      setStage("done");
    } catch (err) {
      fail(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const details = recipient ? (
    <DetailList>
      <DetailRow label="To" value={recipient.name} />
      {settlesAs ? <DetailRow label="They receive" value={settlesAs} /> : null}
      <DetailRow label="Network" value={config?.name ?? asset.network} />
      <DetailRow label="Network fee" value={config?.feeLabel ?? "—"} />
      <DetailRow label="Settlement time" value={config?.settlementTime ?? "—"} rule={Boolean(narration.trim())} />
      {narration.trim() ? <DetailRow label="Narration" value={narration.trim()} rule={false} /> : null}
    </DetailList>
  ) : null;

  const headline = formatAssetAmount(asset, typed);

  if (stage === "done" && recipient) {
    return (
      <TransferSuccess
        back="/home"
        receiptRows={[
          { label: "To", value: recipient.name },
          ...(recipient.tag ? [{ label: "Jumpa tag", value: `@${recipient.tag}` }] : []),
          { label: "Amount", value: headline },
          ...(settlesAs ? [{ label: "They receive", value: settlesAs }] : []),
          { label: "Network", value: config?.name ?? asset.network },
          { label: "Network fee", value: config?.feeLabel ?? "—" },
          ...(narration.trim() ? [{ label: "Narration", value: narration.trim() }] : []),
        ]}
        amount={headline}
        subAmount={note}
        note={
          <span className="pb-4">
            Your money is on its way to <b className="font-bold">{recipient.name}</b>
          </span>
        }
        details={details}
      />
    );
  }

  return (
    <div ref={formRef} className={SCREEN}>
      {stage === "amount" && recipient ? (
        <>
          <SettingsHeader size="lg" title={TITLE} onBack={() => setStage("recipient")} />
          <JumpaAmountForm
            recipient={recipient}
            asset={asset}
            amount={formatAmount(amount)}
            narration={narration}
            balance={balance}
            rate={rateLabel(asset, rates, holding?.priceUsd ?? 0)}
            errors={errors}
            onAmountChange={(value) => {
              setAmount(sanitiseAmount(value, decimalsForAsset(asset)));
              setErrors((e) => ({ ...e, amount: undefined }));
            }}
            onNarrationChange={(value) => {
              setNarration(clampNarration(value));
              setErrors((e) => ({ ...e, narration: undefined }));
            }}
            onPickAsset={() => setSheet("asset")}
            onEditRecipient={() => setStage("recipient")}
            onContinue={continueFromAmount}
          />
        </>
      ) : (
        <>
          <SettingsHeader size="lg" title={TITLE} back="/home" />
          <RecipientStep
            query={query}
            onQueryChange={(value) => {
              setQuery(value);
              setRecipientError(undefined);
            }}
            status={lookup.status}
            recipients={lookup.recipients}
            error={recipientError}
            onPick={pickRecipient}
            onContinue={continueFromRecipient}
          />
        </>
      )}

      {sheet === "asset" ? (
        <AssetSheet
          selected={asset}
          onSelect={(next) => {
            setAsset(next);
            // Precision follows the currency, so a 6-decimal crypto amount cannot carry into naira.
            setAmount((a) => sanitiseAmount(a, decimalsForAsset(next)));
            setErrors({});
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === "review" && recipient ? (
        <ReviewSheet
          summary={
            <div className="flex items-center justify-between gap-3">
              <PairPill
                left="Sending"
                right={asset.code}
                media={
                  <Image src={asset.icon} alt="" width={20} height={20} className="size-5 rounded-full object-cover" />
                }
              />
              <span className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-sm leading-4 font-medium text-jumpa-black">To</span>
                <RecipientTag
                  primary={recipient.name}
                  secondary={recipient.tag ? `@${recipient.tag}` : "Jumpa user"}
                  align="right"
                />
              </span>
            </div>
          }
          headline={headline}
          headlineNote={note}
          onConfirm={() => setSheet("pin")}
          onClose={() => setSheet(null)}
        >
          {details}
        </ReviewSheet>
      ) : null}

      {sheet === "pin" ? (
        <TransferPinSheet
          error={pinError}
          pending={submitting}
          onRetry={() => setPinError(false)}
          onClose={() => setSheet("review")}
          onComplete={send}
        />
      ) : null}

      {failure ? (
        <ResultSheet
          title={failure.title}
          message={failure.message}
          onRetry={
            failure.retry
              ? () => {
                  setFailure(undefined);
                  setSheet("review");
                }
              : undefined
          }
          onClose={() => setFailure(undefined)}
        />
      ) : null}
    </div>
  );
}
