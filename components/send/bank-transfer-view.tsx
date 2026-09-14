"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  type BankForm,
  BankTransferForm,
  EMPTY_BANK_FORM,
  OFFRAMP_NETWORK_CONFIGS,
} from "@/components/send/bank-transfer-form";
import { AmountScreen } from "@/components/transfer/amount-screen";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { PairPill } from "@/components/transfer/pair-pill";
import { RecipientTag } from "@/components/transfer/recipient-tag";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { ResultSheet } from "@/components/ui/result-sheet";
import { getAssetLogo } from "@/lib/assets";
import { COUNTRIES } from "@/lib/transfer";

type Stage = "form" | "amount" | "done";
type Sheet = "review" | "pin" | null;

/** Standard crypto amount chips (e.g. 25, 50, 100 USDC) */
const CRYPTO_CHIPS = [25, 50, 100] as const;

export function BankTransferView({
  defaultCountry = "Nigeria",
}: {
  defaultCountry?: string;
}) {
  const [stage, setStage] = useState<Stage>("form");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [form, setForm] = useState<BankForm>({
    ...EMPTY_BANK_FORM,
    country: defaultCountry,
  });
  const [amount, setAmount] = useState("");

  // Live offramp rate & crypto balance
  const [offrampRate, setOfframpRate] = useState<number>(1450);
  const [cryptoBalance, setCryptoBalance] = useState<number>(0);

  const country = COUNTRIES.find(
    (entry) =>
      entry.label.toLowerCase() === form.country.toLowerCase() ||
      entry.code.toLowerCase() === form.country.toLowerCase(),
  );
  const fiatCurrency = country?.currency ?? "NGN";
  const momo = form.destination === "momo";

  const selectedAsset = form.asset || "USDC";
  const selectedNetwork = form.network || "Base";
  const selectedChain =
    OFFRAMP_NETWORK_CONFIGS[selectedNetwork]?.chain || "base";

  // Fetch live balance for the selected asset
  useEffect(() => {
    let isMounted = true;
    async function loadBalance() {
      try {
        const res = await fetch("/api/wallet/balance");
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (Array.isArray(data.tokens)) {
          const matchedToken = data.tokens.find(
            (t: any) =>
              t.symbol?.toUpperCase() === selectedAsset.toUpperCase() &&
              (!t.network ||
                t.network.toLowerCase().includes(selectedChain.toLowerCase())),
          );
          if (matchedToken) {
            setCryptoBalance(parseFloat(matchedToken.balance) || 0);
            return;
          }
          const anyToken = data.tokens.find(
            (t: any) => t.symbol?.toUpperCase() === selectedAsset.toUpperCase(),
          );
          if (anyToken) {
            setCryptoBalance(parseFloat(anyToken.balance) || 0);
            return;
          }
        }
        if (data.totalUsd) {
          setCryptoBalance(parseFloat(data.totalUsd) || 0);
        }
      } catch {
        // keep fallback
      }
    }
    loadBalance();
    return () => {
      isMounted = false;
    };
  }, [selectedAsset, selectedChain]);

  // Fetch live Switch offramp rate for selected asset & chain
  useEffect(() => {
    let isMounted = true;
    async function loadRate() {
      try {
        const assetKey = `${selectedChain}:${selectedAsset.toLowerCase()}`;
        const res = await fetch("/api/switch/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: 10,
            asset: assetKey,
            direction: "offramp",
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.rate) {
          setOfframpRate(Number(data.rate));
        }
      } catch {
        // keep default rate
      }
    }
    loadRate();
    return () => {
      isMounted = false;
    };
  }, [selectedAsset, selectedChain]);

  const numCryptoAmount = parseFloat(amount) || 0;
  const estimatedFiatAmount = Math.floor(numCryptoAmount * offrampRate);

  const displayBalance = `${cryptoBalance.toFixed(2)} ${selectedAsset}`;

  const rows = momo
    ? [
        { label: "From", value: `Jumpa wallet (${selectedNetwork})` },
        { label: "Type", value: "Mobile money" },
        { label: "To", value: `${form.network} - ${form.phone}` },
        { label: "Recipient", value: form.name || "—" },
      ]
    : [
        {
          label: "From",
          value: `Jumpa wallet (${selectedNetwork})`,
        },
        { label: "Type", value: country?.routing ? "ACH" : "Bank transfer" },
        { label: "To", value: `${form.bank} - ${form.account}` },
        { label: "Recipient", value: form.name || "—" },
        {
          label: "You'll receive",
          value: `₦${estimatedFiatAmount.toLocaleString()} ${fiatCurrency}`,
        },
        {
          label: "Exchange rate",
          value: `1 ${selectedAsset} ≈ ₦${offrampRate.toLocaleString()}`,
        },
        { label: "Settlement", value: "Within seconds" },
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

  const handlePinSubmit = async (pin: string) => {
    setIsSubmitting(true);
    setPinError(false);

    const assetKey = `${selectedChain}:${selectedAsset.toLowerCase()}`;

    try {
      const res = await fetch("/api/switch/offramp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cryptoAmount: numCryptoAmount,
          cryptoToken: selectedAsset,
          asset: assetKey,
          holderName: form.name.trim(),
          accountNumber: form.account.trim(),
          bankName: form.bank.trim(),
          pin,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401 && data.error?.toLowerCase().includes("pin")) {
          setPinError(true);
        } else {
          setErrorMessage(data.error || "Failed to process bank transfer.");
          setSheet(null);
        }
        return;
      }

      setSheet(null);
      setStage("done");
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to connect to transfer service");
      setSheet(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (stage === "done") {
    return (
      <TransferSuccess
        back="/home"
        amount={`${amount} ${selectedAsset} (≈ ₦${estimatedFiatAmount.toLocaleString()})`}
        note={
          <>
            Your money is on its way to{" "}
            <b className="font-bold">
              {form.name || (momo ? form.network : form.bank)}
            </b>
          </>
        }
        details={details}
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
          symbol={selectedAsset}
          balance={displayBalance}
          rate={`1 ${selectedAsset} ≈ ₦${offrampRate.toLocaleString()}${
            numCryptoAmount > 0
              ? ` (≈ ₦${estimatedFiatAmount.toLocaleString()})`
              : ""
          }`}
          chips={CRYPTO_CHIPS}
          chipUnit={selectedAsset}
          onAmountChange={setAmount}
          onReview={() => setSheet("review")}
        />

        {sheet === "review" ? (
          <ReviewSheet
            summary={
              <div className="flex items-center justify-between gap-3">
                <PairPill
                  left="Sending"
                  right={selectedAsset}
                  media={
                    <Image
                      src={getAssetLogo(selectedAsset)}
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
            headline={`${amount} ${selectedAsset}`}
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
            onComplete={handlePinSubmit}
          />
        ) : null}

        {errorMessage ? (
          <ResultSheet
            title="Transfer Failed"
            message={errorMessage}
            onClose={() => setErrorMessage(undefined)}
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
        defaultCountry={defaultCountry}
        onChange={setForm}
        onPickRecent={(account) =>
          setForm({
            ...form,
            destination: "bank",
            country: account.country || "Nigeria",
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
