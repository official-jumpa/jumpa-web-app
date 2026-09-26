"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import * as Primitive from "@radix-ui/react-select";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { Toggle } from "@/components/settings/toggle";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { ArrowDownArrowUpIcon } from "@/components/ui/icons/arrow-down-arrow-up";
import { CaretDownIcon } from "@/components/ui/icons/caret-down";
import { CheckIcon } from "@/components/ui/icons/check";
import { ResultSheet } from "@/components/ui/result-sheet";
import { WalletIcon } from "@/components/ui/icons/wallet";
import { errorMessage, type FriendlyError, friendlyError } from "@/lib/errors";
import { invalidateClientBalances } from "@/lib/client-events";
import { sanitiseAmount } from "@/lib/transfer";
import { formatBalance } from "@/components/transfer/quote-leg";

export interface BridgeBalances {
  stellarUsdc: string;
  baseUsdc: string;
  ethereumUsdc?: string;
}

export interface WalletAddresses {
  stellar: string;
  base: string;
  ethereum?: string;
}

type Direction = "stellar-to-evm" | "evm-to-stellar";
type EvmChain = "ethereum" | "base";
type TransferMode = "fast" | "standard";
type Stage = "quote" | "review" | "done";

interface BridgeQuote {
  fromAmount: string;
  toAmount: string;
  fee: string;
  feeBps: number;
  maxFee: string;
  estimatedTime: string;
  transferType: "fast" | "standard";
}

interface BridgeTxResult {
  txHash: string;
  explorerUrl: string;
  fromChain: string;
  toChain: string;
  sentAmount: string;
  receivedAmount: string;
  recipientAddress: string;
  fee: string;
  arrival: string;
  mode: TransferMode;
}

export function BridgeView({
  bridgeBalances,
  walletAddresses,
  onDone,
}: {
  bridgeBalances: BridgeBalances;
  walletAddresses: WalletAddresses;
  /** The receipt draws its own header, so the screen's chrome steps aside. */
  onDone?: (done: boolean) => void;
}) {
  // ── Bridge Config ──
  const [direction, setDirection] = useState<Direction>("stellar-to-evm");
  const [evmChain, setEvmChain] = useState<EvmChain>("ethereum");
  const [transferMode, setTransferMode] = useState<TransferMode>("fast");
  const [amount, setAmount] = useState("");
  const [customRecipient, setCustomRecipient] = useState(false);
  const [recipientInput, setRecipientInput] = useState("");

  // ── Flow ──
  const [stage, setStage] = useState<Stage>("quote");
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [error, setError] = useState<string>();
  const [txResult, setTxResult] = useState<BridgeTxResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<FriendlyError>();

  // ── Live Quote ──
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const isStellarSource = direction === "stellar-to-evm";
  const evmLabel = evmChain === "ethereum" ? "Ethereum" : "Base";
  const evmChainName = `${evmLabel} Sepolia`;
  const sourceChainName = isStellarSource ? "Stellar Testnet" : evmChainName;
  const destChainName = isStellarSource ? evmChainName : "Stellar Testnet";

  const defaultRecipient = isStellarSource
    ? (evmChain === "ethereum"
      ? (walletAddresses.ethereum || walletAddresses.base)
      : walletAddresses.base)
    : walletAddresses.stellar;

  const targetRecipient = customRecipient
    ? recipientInput.trim()
    : defaultRecipient;

  const evmBalance =
    (evmChain === "ethereum"
      ? bridgeBalances.ethereumUsdc
      : bridgeBalances.baseUsdc) || "0.00";

  const sourceBalance = isStellarSource
    ? bridgeBalances.stellarUsdc
    : evmBalance;

  const destBalance = isStellarSource
    ? evmBalance
    : bridgeBalances.stellarUsdc;

  const feeLabel = quote
    ? parseFloat(quote.fee) === 0
      ? "Free (Sponsored)"
      : `${quote.fee} USDC`
    : "Free (Sponsored)";

  const arrivalLabel =
    quote?.estimatedTime ?? (transferMode === "fast" ? "~20 secs" : "~18 mins");

  const fromChainParam = isStellarSource ? "stellar" : evmChain;
  const toChainParam = isStellarSource ? evmChain : "stellar";

  // Auto-enable fast transfer on supported chains
  useEffect(() => {
    setTransferMode("fast");
  }, [direction, evmChain]);

  // Fetch quote when amount or settings change
  useEffect(() => {
    const num = parseFloat(amount || "0");
    if (isNaN(num) || num <= 0) {
      setQuote(null);
      return;
    }

    let active = true;
    setQuoteLoading(true);

    fetch("/api/bridge/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromChain: fromChainParam,
        toChain: toChainParam,
        amount,
        transferType: transferMode,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data && !data.error) {
          setQuote(data);
        } else {
          setQuote(null);
        }
      })
      .catch(() => {
        if (active) setQuote(null);
      })
      .finally(() => {
        if (active) setQuoteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [amount, direction, transferMode, isStellarSource, fromChainParam, toChainParam]);

  // Flip direction
  function flipDirection() {
    setDirection((prev) =>
      prev === "stellar-to-evm" ? "evm-to-stellar" : "stellar-to-evm",
    );
    setAmount("");
    setQuote(null);
    setCustomRecipient(false);
    setRecipientInput("");
    setError(undefined);
  }

  function fail(raw?: string) {
    setFailure(friendlyError(raw, "transfer"));
    setPinOpen(false);
  }

  // Handle PIN Submit
  async function handlePinSubmit(pin: string) {
    if (!quote) {
      fail("Quote expired");
      return;
    }

    if (!targetRecipient) {
      fail("Missing destination recipient address");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bridge/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          fromChain: fromChainParam,
          toChain: toChainParam,
          amount,
          toAmount: quote.toAmount,
          recipientAddress: targetRecipient,
          transferType: transferMode,
          fee: quote.fee,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 401 && json?.error?.toLowerCase().includes("pin")) {
          setPinError(true);
        } else {
          fail(json?.error);
        }
      } else {
        setTxResult({
          txHash: json.txHash,
          explorerUrl: json.explorerUrl,
          fromChain: sourceChainName,
          toChain: destChainName,
          sentAmount: amount,
          receivedAmount: quote.toAmount,
          recipientAddress: targetRecipient,
          fee: feeLabel,
          arrival: arrivalLabel,
          mode: transferMode,
        });

        invalidateClientBalances();
        setStage("done");
        onDone?.(true);
        setPinOpen(false);
      }
    } catch (e) {
      fail(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ──
  if (stage === "done" && txResult) {
    const recipient = txResult.recipientAddress
      ? `${txResult.recipientAddress.slice(0, 6)}…${txResult.recipientAddress.slice(-6)}`
      : "—";

    return (
      <TransferSuccess
        back="/home"
        title="Bridge initiated"
        amount={`+${formatBalance(txResult.receivedAmount)} USDC`}
        /* The route and the wait are the two things a pending bridge has to
           say, so they sit on the receipt rather than behind "More details". */
        subAmount={`${txResult.fromChain} → ${txResult.toChain}`}
        note={
          <span>
            Arriving at{" "}
            <b className="font-semibold">{recipient}</b> in about{" "}
            <b className="font-semibold">{txResult.arrival}</b>. You can close
            this screen, the transfer keeps going.
          </span>
        }
        titleFirst
        actionsFirst
        ctaLabel="Back to home"
        details={
          <DetailList tone="secondary">
            <DetailRow
              label="Amount sent"
              value={`${formatBalance(txResult.sentAmount)} USDC`}
            />
            <DetailRow
              label="Amount received"
              value={`${formatBalance(txResult.receivedAmount)} USDC`}
            />
            <DetailRow label="Bridge fee" value={txResult.fee} />
            <DetailRow label="From" value={txResult.fromChain} />
            <DetailRow label="To" value={txResult.toChain} />
            <DetailRow
              label="Transfer speed"
              value={txResult.mode === "fast" ? "Fast transfer" : "Standard"}
            />
            <DetailRow label="Estimated arrival" value={txResult.arrival} />
            <DetailRow label="Recipient" value={recipient} />
            {txResult.txHash && (
              <DetailRow
                label="Tx Hash"
                value={
                  <a
                    href={txResult.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-jumpa-primary-600 underline"
                  >
                    {`${txResult.txHash.slice(0, 6)}…${txResult.txHash.slice(-6)}`}
                  </a>
                }
                rule={false}
              />
            )}
          </DetailList>
        }
      />
    );
  }


  const EVM_NETWORKS = [
    { value: "ethereum", logo: "/coins/eth.webp", name: "Ethereum Sepolia" },
    { value: "base", logo: "/coins/base.webp", name: "Base Sepolia" },
  ] as const;

  /** Chain mark overlapping the token mark — the pair a bridge leg moves. */
  const assetPair = (chainLogo: string, chainName: string) => (
    <span className="flex shrink-0 items-center -space-x-1.5">
      <Image
        src={chainLogo}
        alt={chainName}
        width={18}
        height={18}
        className="size-4.5 rounded-full object-cover ring-1 ring-jumpa-white"
      />
      <Image
        src="/coins/usdc.webp"
        alt="USDC"
        width={18}
        height={18}
        className="size-4.5 rounded-full object-cover ring-1 ring-jumpa-white"
      />
    </span>
  );

  const BADGE =
    "flex h-8 shrink-0 items-center gap-1.5 rounded-pill bg-jumpa-secondary-100 px-2.5 text-xs font-medium text-jumpa-primary-950 shadow-jumpa-sm";

  /** The EVM side picks its chain; the Stellar side has nothing to choose. */
  const renderEvmBadge = () => {
    const active =
      EVM_NETWORKS.find((n) => n.value === evmChain) ?? EVM_NETWORKS[0];

    return (
      <Primitive.Root
        value={evmChain}
        onValueChange={(val) => {
          setEvmChain(val as EvmChain);
          setQuote(null);
        }}
      >
        <Primitive.Trigger
          aria-label="Select EVM network"
          className={`${BADGE} tap cursor-pointer outline-none transition-colors hover:bg-jumpa-secondary-200/80 active:scale-[0.98] data-[state=open]:ring-1 data-[state=open]:ring-jumpa-primary-600`}
        >
          {assetPair(active.logo, active.name)}
          <span>USDC</span>
          <Primitive.Icon className="ml-0.5 flex shrink-0 transition-transform duration-200 ease-jumpa data-[state=open]:rotate-180">
            <CaretDownIcon
              aria-hidden="true"
              className="size-3 text-jumpa-neutral-425"
            />
          </Primitive.Icon>
        </Primitive.Trigger>

        <Primitive.Portal>
          <Primitive.Content
            position="popper"
            sideOffset={6}
            className="z-70 min-w-44 animate-drop-in overflow-hidden rounded-surface border border-jumpa-neutral-100 bg-jumpa-white p-1.5 shadow-jumpa-toast"
          >
            <Primitive.Viewport className="flex flex-col gap-1">
              {EVM_NETWORKS.map((network) => (
                <Primitive.Item
                  key={network.value}
                  value={network.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-tile px-3 py-2 text-xs font-medium text-jumpa-black outline-none transition-colors select-none data-[highlighted]:bg-jumpa-primary-50 data-[state=checked]:bg-jumpa-primary-50"
                >
                  {assetPair(network.logo, network.name)}
                  <span className="flex flex-col">
                    <Primitive.ItemText>USDC</Primitive.ItemText>
                    <span className="text-[10px] text-jumpa-neutral-400">
                      {network.name}
                    </span>
                  </span>
                  <Primitive.ItemIndicator className="ml-auto flex text-jumpa-primary-600">
                    <CheckIcon className="size-3.5" />
                  </Primitive.ItemIndicator>
                </Primitive.Item>
              ))}
            </Primitive.Viewport>
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    );
  };

  const renderStellarBadge = () => (
    <span className={BADGE}>
      {assetPair("/coins/xlm.webp", "Stellar")}
      <span>USDC</span>
    </span>
  );

  const balanceLine = (value: string, max?: boolean) => (
    <span className="flex items-center gap-1 text-[10px] leading-3 font-bold text-jumpa-primary-400">
      <WalletIcon aria-hidden="true" className="size-3.5 text-jumpa-primary-600" />
      Balance: {formatBalance(value)}
      {max ? (
        <button
          type="button"
          onClick={() => setAmount(value)}
          className="tap ml-0.5 cursor-pointer rounded-pill bg-jumpa-primary-50 px-1.5 py-0.5 text-[10px] font-bold text-jumpa-primary-600 uppercase hover:bg-jumpa-primary-100"
        >
          Max
        </button>
      ) : null}
    </span>
  );

  return (
    <div className="mt-4 flex animate-fade flex-col gap-4">
      {/* ── Transfer Cards ── */}
      <div className="flex flex-col gap-4 rounded-surface border border-jumpa-neutral-100 bg-jumpa-neutral-95 px-2.5 pt-3 pb-2.5">
        <div className="relative flex flex-col gap-1">
          {/* Send Leg */}
          <div className="flex items-center gap-2.5 rounded-xl bg-jumpa-white p-2.5">
            <span className="flex min-w-0 flex-1 flex-col gap-1 px-2.5">
              <span className="text-[10px] leading-3 text-jumpa-black/50 uppercase">
                You send ({isStellarSource ? "Stellar" : evmLabel})
              </span>
              <input
                value={amount}
                onChange={(e) => {
                  setError(undefined);
                  setAmount(sanitiseAmount(e.target.value, 6));
                }}
                inputMode="decimal"
                aria-label="Amount to bridge"
                className="w-full min-w-0 bg-transparent text-xl leading-6 font-medium text-jumpa-black caret-jumpa-primary-600 outline-none"
                placeholder="0"
              />
            </span>

            <span className="flex shrink-0 flex-col items-end justify-center gap-2.5">
              {isStellarSource ? renderStellarBadge() : renderEvmBadge()}
              {balanceLine(sourceBalance, true)}
            </span>
          </div>

          {/* Direction flip button */}
          <button
            type="button"
            onClick={flipDirection}
            aria-label="Switch bridge direction"
            className="tap absolute top-1/2 left-1/2 z-10 flex size-8.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[0.66px] border-jumpa-black/10 bg-jumpa-primary-525 text-jumpa-alt-400 shadow-jumpa-disc active:scale-90"
          >
            {/* Spins with the direction it just set, so the flip reads as one motion. */}
            <ArrowDownArrowUpIcon
              className={`size-4 transition-transform duration-500 ease-jumpa ${
                isStellarSource ? "" : "rotate-180"
              }`}
            />
          </button>

          {/* Receive Leg */}
          <div className="flex items-center gap-2.5 rounded-xl bg-jumpa-white p-2.5">
            <span className="flex min-w-0 flex-1 flex-col gap-1 px-2.5">
              <span className="text-[10px] leading-3 text-jumpa-black/50 uppercase">
                You receive ({isStellarSource ? evmLabel : "Stellar"})
              </span>
              {/* Opacity and blur only — the row never resizes as a quote lands. */}
              <span
                className={`text-xl leading-6 font-medium text-jumpa-black transition-[opacity,filter] duration-300 ease-jumpa ${
                  quoteLoading ? "opacity-40 blur-[2px]" : "opacity-100 blur-0"
                }`}
              >
                {quote?.toAmount ?? "0.00"}
              </span>
            </span>

            <span className="flex shrink-0 flex-col items-end justify-center gap-2.5">
              {isStellarSource ? renderEvmBadge() : renderStellarBadge()}
              {balanceLine(destBalance)}
            </span>
          </div>
        </div>

        <span className="-mb-px block h-px w-full bg-jumpa-neutral-200" />

        {/* Speed & Bridge Fee Summary */}
        <p className="flex items-center justify-between gap-3 px-2.5 text-xs leading-4 text-jumpa-black/50">
          <span>
            Arrival: <b className="font-bold text-jumpa-black">{arrivalLabel}</b>
          </span>
          <span>
            Bridge Fee: <b className="font-bold text-jumpa-black">{feeLabel}</b>
          </span>
        </p>
      </div>

      {/* ── Recipient Address Section ── */}
      <div className="flex flex-col gap-2 rounded-card border border-jumpa-neutral-100 bg-jumpa-neutral-95 p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-jumpa-neutral-425">
            Recipient ({destChainName})
          </span>
          <button
            type="button"
            onClick={() => setCustomRecipient(!customRecipient)}
            className="tap cursor-pointer text-xs font-semibold text-jumpa-primary-600 hover:underline"
          >
            {customRecipient ? "Use my wallet" : "Change"}
          </button>
        </div>

        {customRecipient ? (
          <input
            value={recipientInput}
            onChange={(e) => setRecipientInput(e.target.value)}
            placeholder={`Enter ${destChainName} address`}
            className="w-full animate-fade rounded-xl border border-jumpa-neutral-100 bg-jumpa-white px-3 py-2 font-mono text-xs transition-colors outline-none focus:border-jumpa-primary-600"
          />
        ) : (
          <div className="flex animate-fade items-center justify-between rounded-xl border border-jumpa-neutral-100 bg-jumpa-white px-3 py-2 font-mono text-xs text-jumpa-neutral-700">
            <span className="truncate pr-2">
              {defaultRecipient
                ? `${defaultRecipient.slice(0, 10)}…${defaultRecipient.slice(-8)}`
                : "No derived address available"}
            </span>
            <span className="shrink-0 rounded-pill bg-jumpa-success/10 px-2 py-0.5 text-[10px] font-semibold text-jumpa-success">
              Your Wallet
            </span>
          </div>
        )}
      </div>

      {/* ── Fast Transfer Toggle ── */}
      <div className="flex items-center justify-between rounded-card border border-jumpa-neutral-100 bg-jumpa-neutral-95 px-4 py-3">
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="text-xs font-semibold text-jumpa-black">
              Fast Transfer
            </span>
            <span className="rounded-pill bg-jumpa-success/10 px-2 py-0.5 text-[9px] font-bold text-jumpa-success">
              Auto
            </span>
          </span>
          <span className="text-[11px] text-jumpa-neutral-425">
            {transferMode === "fast" ? "Faster (~15–30s)" : "Standard (~18 mins)"}
          </span>
        </span>

        <Toggle
          label="Fast transfer"
          checked={transferMode === "fast"}
          onChange={(on) => setTransferMode(on ? "fast" : "standard")}
        />
      </div>

      {/* ── Review & PIN Execution ── */}
      <div className="flex flex-col items-center gap-3">
        <FieldError>{error}</FieldError>
        <Button
          variant="gradient"
          size="lg"
          onClick={() => {
            if (!Number(amount)) {
              setError("Enter an amount to bridge");
            } else if (!quote) {
              setError("Waiting for bridge quote. Please try again.");
            } else if (!targetRecipient) {
              setError("Destination address required");
            } else {
              setStage("review");
            }
          }}
        >
          Review bridge
        </Button>
      </div>

      {/* ── Review Sheet ── */}
      {stage === "review" && !pinOpen ? (
        <ReviewSheet
          summary={
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-jumpa-black">
                {sourceChainName} → {destChainName}
              </span>
              <span className="shrink-0 rounded-pill bg-jumpa-success/10 px-2 py-0.5 text-[10px] font-bold text-jumpa-success">
                {transferMode === "fast" ? "Fast Transfer" : "Standard"}
              </span>
            </div>
          }
          headlineLabel="YOU RECEIVE"
          headline={`${quote?.toAmount ?? amount} USDC`}
          onConfirm={() => setPinOpen(true)}
          onClose={() => setStage("quote")}
        >
          <DetailList tone="secondary">
            <DetailRow label="Source network" value={sourceChainName} />
            <DetailRow label="Destination network" value={destChainName} />
            <DetailRow label="Bridge Fee" value={feeLabel} />
            <DetailRow label="Estimated arrival" value={arrivalLabel} />
            <DetailRow
              label="Recipient"
              value={
                targetRecipient
                  ? `${targetRecipient.slice(0, 6)}…${targetRecipient.slice(-6)}`
                  : "—"
              }
              rule={false}
            />
          </DetailList>
        </ReviewSheet>
      ) : null}

      {/* ── PIN Sheet ── */}
      {pinOpen ? (
        <TransferPinSheet
          error={pinError}
          pending={submitting}
          onRetry={() => setPinError(false)}
          onClose={() => {
            setPinOpen(false);
            setPinError(false);
          }}
          onComplete={handlePinSubmit}
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
                  setStage("quote");
                }
              : undefined
          }
          onClose={() => setFailure(undefined)}
        />
      ) : null}
    </div>
  );
}
