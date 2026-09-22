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
import { calculateFossaPayWithdrawalFee } from "@/lib/ngn-account";

type Stage = "form" | "amount" | "done";
type Sheet = "review" | "pin" | null;

/** Standard crypto amount chips (e.g. 25, 50, 100 USDC) */
const CRYPTO_CHIPS = [25, 50, 100] as const;
/** Standard fiat amount chips in Naira (e.g. 1k, 5k, 10k NGN) */
const FIAT_CHIPS = [1000, 5000, 10000] as const;

export function BankTransferView({
  defaultCountry = "Nigeria",
  initialNetwork,
  initialAsset,
}: {
  defaultCountry?: string;
  initialNetwork?: string;
  initialAsset?: string;
}) {
  const [stage, setStage] = useState<Stage>("form");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [offrampStatus, setOfframpStatus] = useState<"CONFIRMED" | "PENDING">("CONFIRMED");
  const [currencyMode, setCurrencyMode] = useState<"crypto" | "fiat">("crypto");

  const [form, setForm] = useState<BankForm>(() => {
    const net = initialNetwork || EMPTY_BANK_FORM.network;
    const ast =
      initialAsset ||
      (net === "Nigeria Bank" ? "NGN" : EMPTY_BANK_FORM.asset);
    return {
      ...EMPTY_BANK_FORM,
      country: defaultCountry,
      network: net,
      asset: ast,
    };
  });
  const [amount, setAmount] = useState("");

  // Live offramp rate & crypto balance
  const [offrampRate, setOfframpRate] = useState<number>(1450);
  const [cryptoBalance, setCryptoBalance] = useState<number>(0);
  const [ngnBalance, setNgnBalance] = useState<number>(0);

  const isFiatWithdrawal =
    form.network === "Nigeria Bank" || form.asset === "NGN";

  const country = COUNTRIES.find(
    (entry) =>
      entry.label.toLowerCase() === form.country.toLowerCase() ||
      entry.code.toLowerCase() === form.country.toLowerCase(),
  );
  const fiatCurrency = country?.currency ?? "NGN";
  const momo = form.destination === "momo";

  const selectedAsset = form.asset || (isFiatWithdrawal ? "NGN" : "USDC");
  const selectedNetwork = form.network || "Nigeria Bank";
  const selectedChain =
    OFFRAMP_NETWORK_CONFIGS[selectedNetwork]?.chain || "base";

  // Fetch live NGN balance for FossaPay fiat withdrawals
  useEffect(() => {
    let isMounted = true;
    async function loadNgnBalance() {
      try {
        const res = await fetch("/api/ngn-account");
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.hasAccount && data.balance) {
          setNgnBalance(data.balance.availableBalance || 0);
        }
      } catch {
        // keep fallback
      }
    }
    loadNgnBalance();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch live balance for the selected asset
  useEffect(() => {
    if (isFiatWithdrawal) return;
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
  }, [selectedAsset, selectedChain, isFiatWithdrawal]);

  // Fetch live Switch offramp rate for selected asset & chain
  useEffect(() => {
    if (isFiatWithdrawal) return;
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
  }, [selectedAsset, selectedChain, isFiatWithdrawal]);

  const rawTypedNumber = parseFloat(amount) || 0;

  const isInternal = Boolean(form.isInternal);
  const fiatFee = isFiatWithdrawal
    ? isInternal
      ? 0
      : calculateFossaPayWithdrawalFee(rawTypedNumber)
    : 0;
  const fiatTotalDebit = isFiatWithdrawal ? rawTypedNumber + fiatFee : 0;

  // Calculate maximum spendable Naira reserving the correct tier fee for external payouts
  const calculateMaxSpendableNgn = (
    balance: number,
    isInternalAcc: boolean,
  ): number => {
    if (balance <= 0) return 0;
    if (isInternalAcc) return balance;
    const feeCandidate = calculateFossaPayWithdrawalFee(balance);
    const candidate = balance - feeCandidate;
    if (candidate <= 0) return 0;
    const actualFee = calculateFossaPayWithdrawalFee(candidate);
    return Math.max(0, balance - actualFee);
  };

  // Bidirectional conversions for crypto offramp
  const numCryptoAmount =
    currencyMode === "crypto"
      ? rawTypedNumber
      : offrampRate > 0
        ? Number((rawTypedNumber / offrampRate).toFixed(2))
        : 0;

  const targetFiatAmount =
    currencyMode === "fiat"
      ? rawTypedNumber
      : Math.floor(rawTypedNumber * offrampRate);

      // balance and asset
  const displayBalance = isFiatWithdrawal
    ? `₦${ngnBalance.toLocaleString()}`
    : `${cryptoBalance.toFixed(2)} ${selectedAsset}`;

  const maxFiatSpendable = isFiatWithdrawal
    ? calculateMaxSpendableNgn(ngnBalance, isInternal)
    : Math.floor(cryptoBalance * offrampRate);

  // Smooth mode toggle with live conversion
  const handleCurrencyModeChange = (newMode: "crypto" | "fiat") => {
    if (newMode === currencyMode || isFiatWithdrawal) return;
    if (!amount || parseFloat(amount) === 0) {
      setCurrencyMode(newMode);
      return;
    }
    const currentVal = parseFloat(amount);
    if (newMode === "fiat") {
      const converted = Math.floor(currentVal * offrampRate);
      setAmount(converted > 0 ? String(converted) : "");
    } else {
      const converted =
        offrampRate > 0 ? Number((currentVal / offrampRate).toFixed(2)) : 0;
      setAmount(converted > 0 ? String(converted) : "");
    }
    setCurrencyMode(newMode);
  };

  const currencyOptions = isFiatWithdrawal
    ? [{ value: "fiat" as const, label: "NGN (₦)" }]
    : [
        { value: "crypto" as const, label: selectedAsset },
        { value: "fiat" as const, label: "NGN (₦)" },
      ];

  const rows = isFiatWithdrawal
    ? [
        { label: "From", value: "Jumpa NGN Wallet" },
        {
          label: "Type",
          value: isInternal ? "Internal Transfer" : "Bank transfer",
        },
        { label: "To", value: `${form.bank} - ${form.account}` },
        { label: "Recipient", value: form.name || "—" },
        {
          label: "Transfer amount",
          value: `₦${rawTypedNumber.toLocaleString()}`,
        },
        {
          label: "Withdrawal fee",
          value: isInternal ? "₦0" : `₦${fiatFee}`,
        },
        {
          label: "Total debit",
          value: `₦${fiatTotalDebit.toLocaleString()}`,
        },
        { label: "Settlement", value: "Instant" },
        ...(form.note ? [{ label: "Narration", value: form.note }] : []),
      ]
    : momo
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
            value: `₦${targetFiatAmount.toLocaleString()} ${fiatCurrency}`,
          },
          {
            label: "You'll pay",
            value: `${numCryptoAmount} ${selectedAsset}`,
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

    if (isFiatWithdrawal) {
      try {
        const res = await fetch("/api/ngn-account/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: rawTypedNumber,
            accountNumber: form.account.trim(),
            bankName: form.bank.trim(),
            accountName: form.name.trim(),
            pin,
            narration: form.note || undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          if (res.status === 401 && data.error?.toLowerCase().includes("pin")) {
            setPinError(true);
          } else {
            setErrorMessage(data.error || "Failed to process bank withdrawal.");
            setSheet(null);
          }
          return;
        }

        setSheet(null);
        setStage("done");
      } catch (err: any) {
        setErrorMessage(
          err?.message || "Failed to connect to withdrawal service",
        );
        setSheet(null);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Crypto offramp execution via Switch
    const assetKey = `${selectedChain}:${selectedAsset.toLowerCase()}`;

    try {
      const res = await fetch("/api/switch/offramp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cryptoAmount: numCryptoAmount,
          fiatAmount: targetFiatAmount,
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
      // Preserve PENDING status so the success screen can show the right message
      setOfframpStatus(data.status === "PENDING" ? "PENDING" : "CONFIRMED");
      setStage("done");
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to connect to transfer service");
      setSheet(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (stage === "done") {
    const isPending = offrampStatus === "PENDING";
    return (
      <TransferSuccess
        back="/home"
        title={isPending ? "Transfer Submitted" : "Payment Successful"}
        amount={
          isFiatWithdrawal
            ? `₦${rawTypedNumber.toLocaleString()}`
            : `${numCryptoAmount} ${selectedAsset} (≈ ₦${targetFiatAmount.toLocaleString()})`
        }
        note={
          isPending ? (
            <>
              Your transfer is pending and being processed. Your money will arrive at{" "}
              <b className="font-bold">
                {form.name || (momo ? form.network : form.bank)}
              </b>{" "}
              shortly
            </>
          ) : (
            <>
              Your money is on its way to{" "}
              <b className="font-bold">
                {form.name || (momo ? form.network : form.bank)}
              </b>
            </>
          )
        }
        details={details}
      />
    );
  }

  if (stage === "amount") {
    const rateSubtitle = isFiatWithdrawal
      ? isInternal
        ? "₦0 fee"
        : rawTypedNumber > 0
          ? `Fee: ₦${fiatFee}`
          : "Standard bank transfer fee applies"
      : currencyMode === "crypto"
        ? `1 ${selectedAsset} ≈ ₦${offrampRate.toLocaleString()}${
            numCryptoAmount > 0
              ? ` (≈ ₦${targetFiatAmount.toLocaleString()})`
              : ""
          }`
        : `1 ${selectedAsset} ≈ ₦${offrampRate.toLocaleString()}${
            targetFiatAmount > 0
              ? ` (≈ ${numCryptoAmount} ${selectedAsset})`
              : ""
          }`;

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
          symbol={isFiatWithdrawal ? "NGN" : selectedAsset}
          balance={
            isFiatWithdrawal
              ? `₦${ngnBalance.toLocaleString()}`
              : currencyMode === "crypto"
                ? displayBalance
                : `₦${maxFiatSpendable.toLocaleString()} (${displayBalance})`
          }
          maxAmount={
            isFiatWithdrawal
              ? maxFiatSpendable
              : currencyMode === "crypto"
                ? cryptoBalance
                : maxFiatSpendable
          }
          inputPrefix={
            isFiatWithdrawal || currencyMode === "fiat" ? "₦" : undefined
          }
          rate={rateSubtitle}
          chips={isFiatWithdrawal ? FIAT_CHIPS : currencyMode === "crypto" ? CRYPTO_CHIPS : FIAT_CHIPS}
          chipUnit={
            isFiatWithdrawal ? "₦" : currencyMode === "crypto" ? selectedAsset : "₦"
          }
          currencyMode={isFiatWithdrawal ? "fiat" : currencyMode}
          currencyOptions={currencyOptions}
          onCurrencyModeChange={handleCurrencyModeChange}
          onAmountChange={setAmount}
          onReview={() => setSheet("review")}
        />

        {sheet === "review" ? (
          <ReviewSheet
            summary={
              <div className="flex items-center justify-between gap-3">
                <PairPill
                  left="Sending"
                  right={isFiatWithdrawal ? "NGN" : selectedAsset}
                  media={
                    <Image
                      src={
                        isFiatWithdrawal
                          ? "/images/usd/ngncoin.svg"
                          : getAssetLogo(selectedAsset)
                      }
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
            headline={
              isFiatWithdrawal
                ? `₦${rawTypedNumber.toLocaleString()}`
                : currencyMode === "fiat"
                  ? `₦${targetFiatAmount.toLocaleString()} (${numCryptoAmount} ${selectedAsset})`
                  : `${numCryptoAmount} ${selectedAsset}`
            }
            onConfirm={() => setSheet("pin")}
            onClose={() => setSheet(null)}
          >
            {details}
          </ReviewSheet>
        ) : null}

        {sheet === "pin" ? (
          <TransferPinSheet
            error={pinError}
            pending={isSubmitting}
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
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
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
