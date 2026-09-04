"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  EMPTY_WALLET_FORM,
  WalletAddressForm,
  type WalletForm,
} from "@/components/send/wallet-address-form";
import { AmountScreen } from "@/components/transfer/amount-screen";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { PairPill } from "@/components/transfer/pair-pill";
import { RecipientTag } from "@/components/transfer/recipient-tag";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { getAssetLogo } from "@/lib/assets";
import {
  NETWORK_CONFIGS,
  shortenAddress,
} from "@/lib/transfer";
import type { Promotion } from "@/lib/wallet";

type Stage = "form" | "amount" | "done";
type Sheet = "review" | "pin" | null;

/** Chips this flow offers; the design drops the 5 the bank flow shows. */
const CHIPS = [25, 50, 100] as const;

/** On-chain send, end to end: address, amount, review, PIN, receipt. */
export function WalletAddressView({ promotions }: { promotions: Promotion[] }) {
  const [stage, setStage] = useState<Stage>("form");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<{
    txHash: string;
    explorerUrl: string;
  } | null>(null);
  const [form, setForm] = useState<WalletForm>(EMPTY_WALLET_FORM);
  const [amount, setAmount] = useState("");
  const [liveBalance, setLiveBalance] = useState("$0.00");

  const currentConfig =
    NETWORK_CONFIGS[form.network] || NETWORK_CONFIGS["Stellar Mainnet"];
  const network = form.network.replace(" ", " - ");
  const short = shortenAddress(form.address, 18, 0);

  // Fetch live balance for current selected asset & chain
  useEffect(() => {
    let isMounted = true;
    async function loadBalance() {
      try {
        const res = await fetch("/api/wallet/balance");
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        const isTestnet = currentConfig.network === "testnet";

        if (Array.isArray(data.tokens)) {
          const matched = data.tokens.find(
            (t: any) =>
              t.symbol?.toUpperCase() === form.asset.toUpperCase() &&
              (isTestnet ? Boolean(t.isTestnet) : !t.isTestnet) &&
              (!t.network ||
                t.network.toLowerCase().includes(currentConfig.chain.toLowerCase())),
          );
          if (matched) {
            const tokenAmount = parseFloat(matched.balance) || 0;
            setLiveBalance(`${tokenAmount} ${form.asset}`);
            return;
          }
        }

        if (isTestnet && data.testnetSummary) {
          const key = `Stellar Testnet (${form.asset.toUpperCase()})`;
          if (data.testnetSummary[key]) {
            setLiveBalance(data.testnetSummary[key]);
            return;
          }
        }

        if (data.totalUsd) {
          setLiveBalance(`$${data.totalUsd}`);
        }
      } catch {
        // keep previous
      }
    }
    loadBalance();
    return () => {
      isMounted = false;
    };
  }, [form.asset, form.network, currentConfig.chain, currentConfig.network]);

  const handlePinSubmit = async (pin: string) => {
    setIsSubmitting(true);
    setPinError(false);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/wallet/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: form.address.trim(),
          amount,
          asset: form.asset,
          network: form.network,
          memo: form.memo,
          pin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 && data.error?.toLowerCase().includes("pin")) {
          setPinError(true);
        } else {
          setErrorMessage(data.error || "Transfer failed on-chain.");
        }
        return;
      }

      setTxResult({
        txHash: data.txHash,
        explorerUrl: data.explorerUrl,
      });
      setSheet(null);
      setStage("done");
    } catch (err: any) {
      setErrorMessage(err?.message || "Network request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const details = (
    <DetailList>
      <DetailRow label="Network" value={currentConfig.name} />
      <DetailRow label="Asset" value={form.asset} />
      <DetailRow label="Network fee" value={currentConfig.feeLabel} />
      <DetailRow
        label="Settlement time"
        value={currentConfig.settlementTime}
      />
      {form.memo?.trim() ? (
        <DetailRow label="Memo" value={form.memo.trim()} rule={false} />
      ) : null}
    </DetailList>
  );

  if (stage === "done") {
    return (
      <TransferSuccess
        back="/home"
        amount={`${amount} ${form.asset}`}
        note={
          <div className="flex flex-col items-center gap-2 pb-4">
            <span>
              Your money is on its way to{" "}
              <b className="font-bold">{shortenAddress(form.address)}</b>
            </span>
            {/* i dont think the explorer link is needed since we are abstracting a lof from the users */}
            {/* {txResult?.explorerUrl ? (
              <a
                href={txResult.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-jumpa-primary-600 underline"
              >
                View on Explorer ({shortenAddress(txResult.txHash, 8, 6)})
              </a>
            ) : null} */}
          </div>
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
          recipient={<RecipientTag primary={`${short}…`} secondary={network} />}
          onClose={() => setStage("form")}
          amount={amount}
          symbol={form.asset}
          balance={liveBalance}
          chips={CHIPS}
          rate=""
          caption="Always verify the address is correct. Payments to wrong addresses cannot be reversed."
          onAmountChange={setAmount}
          onReview={() => setSheet("review")}
        />

        {sheet === "review" ? (
          <ReviewSheet
            summary={
              <div className="flex items-center justify-between gap-3">
                <PairPill
                  left="Sending"
                  right={form.asset}
                  media={
                    <Image
                      src={getAssetLogo(form.asset)}
                      alt=""
                      width={20}
                      height={20}
                      className="size-5 rounded-full object-contain"
                    />
                  }
                />
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-sm leading-4 font-medium text-jumpa-black">
                    To
                  </span>
                  <RecipientTag
                    primary={`${short}…`}
                    secondary={network}
                    align="right"
                  />
                </span>
              </div>
            }
            headline={`${amount} ${form.asset}`}
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
            onRetry={() => {
              setPinError(false);
              setErrorMessage(null);
            }}
            onClose={() => {
              setSheet("review");
              setErrorMessage(null);
            }}
            onComplete={handlePinSubmit}
          />
        ) : null}

        {errorMessage ? (
          <div className="fixed bottom-6 left-4 right-4 z-50 rounded-lg bg-red-600 px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
            {errorMessage}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader back="/send" title="Wallet address" />
      <WalletAddressForm
        form={form}
        onChange={setForm}
        onPickRecent={(contact) =>
          setForm({
            ...form,
            address: contact.address,
            network: contact.network,
            pasted: false,
          })
        }
        onProceed={() => setStage("amount")}
      />
    </div>
  );
}
