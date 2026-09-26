"use client";

import { useState } from "react";
import { SwapSettingsSheet } from "@/components/swap/swap-settings-sheet";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { PairPill } from "@/components/transfer/pair-pill";
import {
  assetOptions,
  formatBalance,
  QuoteLeg,
} from "@/components/transfer/quote-leg";
import { QuoteLockNote } from "@/components/transfer/quote-lock-note";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { ArrowDownArrowUpIcon } from "@/components/ui/icons/arrow-down-arrow-up";
import { GearIcon } from "@/components/ui/icons/gear";
import { ResultSheet } from "@/components/ui/result-sheet";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useSwapQuote } from "@/hooks/use-swap-quote";
import { errorMessage, type FriendlyError, friendlyError } from "@/lib/errors";
import { invalidateClientBalances } from "@/lib/client-events";
import { decimalsFor } from "@/lib/token-amount";
import { sanitiseAmount, SWAP_QUOTE } from "@/lib/transfer";

import {
  BridgeView,
  type BridgeBalances,
  type WalletAddresses,
} from "@/components/swap/bridge-view";

/** Assets available for swap. Extend when new chains are integrated. */
const SWAP_ASSETS = ["XLM", "USDC"] as const;

type Stage = "quote" | "review" | "done";

interface TxResult {
  txHash: string;
  explorerUrl: string;
  received: string;
  receivedToken: string;
}

export interface StellarBalances {
  xlm: string;
  usdc: string;
}

export function SwapView({
  stellarBalances,
  bridgeBalances,
  walletAddresses,
}: {
  stellarBalances: StellarBalances;
  bridgeBalances?: BridgeBalances;
  walletAddresses?: WalletAddresses;
}) {
  // ── Header mode (Swap vs Bridge) ──
  const [mode, setMode] = useState<"swap" | "bridge">("swap");

  // ── Settings ──
  const [slippage, setSlippage] = useState(0.5);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Swap pair ──
  const tokenOptions = assetOptions(SWAP_ASSETS);
  const [fromToken, setFromToken] = useState<string>(SWAP_ASSETS[0]);
  const [toToken, setToToken] = useState<string>(SWAP_ASSETS[1]);
  const [amount, setAmount] = useState("");

  // ── Flow ──
  const [stage, setStage] = useState<Stage>("quote");
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [error, setError] = useState<string>();
  const [txResult, setTxResult] = useState<TxResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<FriendlyError>();

  // ── Live quote ──
  const {
    quote,
    loading: quoteLoading,
    error: quoteError,
  } = useSwapQuote({
    fromToken,
    toToken,
    amount,
    slippage,
  });

  const received = quote?.amountOut ?? "—";
  const rate = quote?.rate ?? (quoteLoading ? "Fetching…" : "—");
  const estimatedFee = "None";
  const quoteSlippage = quote?.slippage ?? `${slippage}%`;

  // ── Balance lookup ──
  function balanceFor(token: string): string {
    const t = token.toUpperCase();
    if (t === "XLM") return formatBalance(stellarBalances.xlm);
    if (t === "USDC") return formatBalance(stellarBalances.usdc);
    return "0";
  }

  // ── Direction flip ──
  function flipPair() {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount("");
  }

  // A rejected PIN stays in the sheet, where it can be retyped. Anything else
  // ended the attempt, so it leaves the sheet and says so in plain copy — the
  // swap failing is not the user mistyping their PIN.
  function fail(raw?: string) {
    setFailure(friendlyError(raw, "swap"));
    setPinOpen(false);
  }

  // ── PIN submission — calls /api/swap/execute ──
  async function handlePinSubmit(pin: string) {
    if (!quote) {
      fail("Quote expired");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/swap/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          rawQuote: quote,
          network: "mainnet",
          fromToken,
          toToken,
          fromAmount: amount,
          toAmount: quote.amountOut,
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
          received: quote.amountOut,
          receivedToken: toToken,
        });

        // Instantly notify components and clear cached balances
        invalidateClientBalances();

        setStage("done");
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
    return (
      <TransferSuccess
        back="/home"
        title="Swap successful"
        amount={`+${txResult.received} ${txResult.receivedToken}`}
        titleFirst
        actionsFirst
        ctaLabel="Back to home"
        details={
          <DetailList tone="secondary">
            <DetailRow label="Network fee" value={estimatedFee} />
            <DetailRow label="Slippage" value={quoteSlippage} />
            {txResult.txHash && (
              <DetailRow
                label="Tx Hash"
                value={`${txResult.txHash.slice(0, 6)}…${txResult.txHash.slice(-6)}`}
                rule={false}
              />
            )}
          </DetailList>
        }
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] max-w-app mx-auto w-full">
      {/* ── Header ── */}
      <ScreenHeader
        back="/home"
        onBack={
          mode === "swap" && stage === "review"
            ? () => setStage("quote")
            : undefined
        }
        center={
          <div className="flex items-center rounded-full bg-jumpa-neutral-90 p-1 border border-black/5">
            <button
              type="button"
              onClick={() => setMode("swap")}
              className={`rounded-full px-4 py-1 text-xs font-semibold transition-all ${
                mode === "swap"
                  ? "bg-white text-jumpa-black shadow-sm"
                  : "text-jumpa-black/60 hover:text-jumpa-black"
              }`}
            >
              Swap
            </button>
            <button
              type="button"
              onClick={() => setMode("bridge")}
              className={`rounded-full px-4 py-1 text-xs font-semibold transition-all ${
                mode === "bridge"
                  ? "bg-white text-jumpa-black shadow-sm"
                  : "text-jumpa-black/60 hover:text-jumpa-black"
              }`}
            >
              Bridge
            </button>
          </div>
        }
        round
      />

      {mode === "bridge" ? (
        <BridgeView
          bridgeBalances={
            bridgeBalances || {
              stellarUsdc: "0.00",
              baseUsdc: "0.00",
              ethereumUsdc: "0.00",
            }
          }
          walletAddresses={
            walletAddresses || { stellar: "", base: "", ethereum: "" }
          }
        />
      ) : (
        <>
          {/* ── Settings sheet (slippage) ── */}
          {settingsOpen && (
            <SwapSettingsSheet
              slippage={slippage}
              onSlippageChange={setSlippage}
              onClose={() => setSettingsOpen(false)}
            />
          )}

          {/* ── Quote stage ── */}
          <div className="mt-6 flex flex-col gap-6">
            <div className="flex flex-col gap-4 rounded-surface bg-jumpa-neutral-95 px-2.5 pt-3 pb-2.5">
              <div className="relative flex flex-col gap-1">
                <QuoteLeg
                  label="You send"
                  symbol={fromToken}
                  balance={balanceFor(fromToken)}
                  options={tokenOptions}
                  onSymbolChange={(s) => {
                    if (s === toToken) flipPair();
                    else setFromToken(s);
                  }}
                >
                  <input
                    value={amount}
                    onChange={(e) => {
                      setError(undefined);
                      setAmount(
                        sanitiseAmount(e.target.value, decimalsFor(fromToken)),
                      );
                    }}
                    inputMode="decimal"
                    aria-label="Amount to swap"
                    className="w-full min-w-0 bg-transparent text-xl leading-6 font-medium text-jumpa-black caret-jumpa-primary-600 outline-none"
                    placeholder="0"
                  />
                </QuoteLeg>

                <button
                  type="button"
                  onClick={flipPair}
                  aria-label="Swap direction"
                  className="tap absolute top-1/2 left-1/2 flex size-8.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[0.66px] border-jumpa-black/10 bg-jumpa-primary-525 text-jumpa-alt-400 shadow-jumpa-disc active:scale-90"
                >
                  <ArrowDownArrowUpIcon className="size-4" />
                </button>

                <QuoteLeg
                  label="You receive"
                  symbol={toToken}
                  balance={balanceFor(toToken)}
                  options={tokenOptions}
                  onSymbolChange={(s) => {
                    if (s === fromToken) flipPair();
                    else setToToken(s);
                  }}
                >
                  <span className="text-xl leading-6 font-medium text-jumpa-black">
                    {quoteLoading ? (
                      <span className="animate-pulse text-jumpa-black/40">…</span>
                    ) : (
                      received
                    )}
                  </span>
                </QuoteLeg>
              </div>

              <span className="-mb-px block h-px w-full bg-jumpa-neutral-200" />

              <p className="flex items-center justify-between gap-3 px-2.5 text-xs leading-4 text-jumpa-black/50">
                <span>
                  Rate{" "}
                  <b className="font-bold text-jumpa-black">
                    {quoteLoading ? "…" : rate}
                  </b>
                </span>
                <span>
                  Fee <b className="font-bold text-jumpa-black">{estimatedFee}</b>
                </span>
              </p>
            </div>

            <DetailList tone="secondary">
              <DetailRow label="Network fee" value={estimatedFee} />
              <DetailRow
                label="Slippage tolerance"
                value={
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    aria-label="Adjust slippage tolerance"
                    className="tap -my-0.5 inline-flex items-center gap-1.5 rounded-full border border-jumpa-primary-600/25 bg-jumpa-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-jumpa-primary-600 transition-colors hover:bg-jumpa-neutral-200 active:scale-95"
                  >
                    <span>{quoteSlippage}</span>
                    <GearIcon className="size-3 text-jumpa-primary-600" />
                  </button>
                }
                rule={false}
              />
            </DetailList>

            {quoteError && <FieldError>{quoteError}</FieldError>}

            <div className="flex flex-col items-center gap-3">
              <FieldError>{error}</FieldError>
              <Button
                variant="gradient"
                size="lg"
                onClick={() => {
                  if (!Number(amount)) {
                    setError("Enter an amount to swap");
                  } else if (!quote) {
                    setError(
                      "Waiting for a quote. Please try again in a moment.",
                    );
                  } else {
                    setStage("review");
                  }
                }}
              >
                Review swap
              </Button>
            </div>

            <QuoteLockNote seconds={SWAP_QUOTE.lockSeconds} />
          </div>

          {/* ── Review sheet ── */}
          {stage === "review" && !pinOpen ? (
            <ReviewSheet
              summary={
                <div className="flex items-center justify-between gap-3">
                  <PairPill
                    left={fromToken}
                    right={toToken}
                    media={<ArrowDownArrowUpIcon className="size-4 -rotate-90" />}
                  />
                  <span className="shrink-0 text-[10px] leading-4 text-jumpa-black/50">
                    Rate <b className="font-bold text-jumpa-black">{rate}</b>
                  </span>
                </div>
              }
              headlineLabel="YOU RECEIVE"
              headline={`${received} ${toToken}`}
              onConfirm={() => setPinOpen(true)}
              onClose={() => setStage("quote")}
            >
              <DetailList tone="secondary">
                <DetailRow label="Network fee" value={estimatedFee} />
                <DetailRow label="Slippage" value={quoteSlippage} />
                <DetailRow
                  label="Network"
                  value="Stellar Mainnet"
                  rule={false}
                />
              </DetailList>
            </ReviewSheet>
          ) : null}

          {/* ── PIN sheet ── */}
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
        </>
      )}
    </div>
  );
}
