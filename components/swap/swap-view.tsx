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
import { Select, type SelectOption } from "@/components/ui/select";
import { useSwapQuote } from "@/hooks/use-swap-quote";
import { errorMessage, type FriendlyError, friendlyError } from "@/lib/errors";
import { invalidateClientBalances } from "@/lib/client-events";
import { decimalsFor } from "@/lib/token-amount";
import { sanitiseAmount } from "@/lib/transfer";

import {
  BridgeView,
  type BridgeBalances,
  type WalletAddresses,
} from "@/components/swap/bridge-view";

/** Assets available for swap per chain. */
const NETWORK_ASSETS = {
  stellar: ["XLM", "USDC"] as const,
  solana: ["SOL", "USDC", "USDT"] as const,
} as const;

export type SwapChain = keyof typeof NETWORK_ASSETS;

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
  /** XLM less the account reserve, from Horizon. Absent when the lookup failed. */
  xlmSpendable?: string;
}

/**
 * A native token can't be swapped to zero: XLM keeps a fee on top of its
 * reserve, SOL keeps fees plus rent for the account and the output token's.
 */
const NATIVE_HOLDBACK: Record<string, { amount: number; reason: string }> = {
  XLM: { amount: 0.01, reason: "Stellar's account reserve and fees" },
  SOL: { amount: 0.005, reason: "network fees and account rent" },
};

/** The reserve when Horizon gave no figure: two base reserves plus a USDC trustline. */
const FALLBACK_XLM_RESERVE = 1.5;

export interface SolanaBalances {
  sol: string;
  usdc: string;
  usdt: string;
}

type SwapMode = "swap" | "bridge";

const MODES: readonly SwapMode[] = ["swap", "bridge"];

export function SwapView({
  stellarBalances,
  solanaBalances = { sol: "0.00", usdc: "0.00", usdt: "0.00" },
  bridgeBalances,
  walletAddresses,
}: {
  stellarBalances: StellarBalances;
  solanaBalances?: SolanaBalances;
  bridgeBalances?: BridgeBalances;
  walletAddresses?: WalletAddresses;
}) {
  // ── Header mode (Swap vs Bridge) ──
  const [mode, setMode] = useState<SwapMode>("swap");
  /** The bridge receipt draws its own header; this hides the screen's. */
  const [bridgeDone, setBridgeDone] = useState(false);

  // ── Network selector (Stellar vs Solana) ──
  const [network, setNetwork] = useState<SwapChain>("stellar");

  const networkOptions: SelectOption[] = [
    {
      value: "stellar",
      label: "Stellar",
    },
    {
      value: "solana",
      label: "Solana",
    },
  ];

  // ── Settings ──
  const [slippage, setSlippage] = useState(0.5);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Swap pair ──
  const activeAssets = NETWORK_ASSETS[network];
  const tokenOptions = assetOptions(activeAssets);
  const [fromToken, setFromToken] = useState<string>(activeAssets[0]);
  const [toToken, setToToken] = useState<string>(activeAssets[1]);
  const [amount, setAmount] = useState("");

  // Switch network helper
  function handleNetworkChange(nextNetwork: string) {
    const net = nextNetwork as SwapChain;
    if (net === network) return;
    setNetwork(net);
    const nextAssets = NETWORK_ASSETS[net];
    setFromToken(nextAssets[0]);
    setToToken(nextAssets[1]);
    setAmount("");
  }

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
    chain: network,
    fromToken,
    toToken,
    amount,
    slippage,
  });

  const received = quote?.amountOut ?? "0.00";
  const rate = quote?.rate ?? (quoteLoading ? "Fetching…" : "0.00");
  const estimatedFee = network === "solana" ? "~0.00005 SOL" : "0.00";
  const quoteSlippage = quote?.slippage ?? `${slippage}%`;

  // ── Balance lookup ──
  function getRawBalance(token: string): number {
    const t = token.toUpperCase();
    let str = "0";
    if (network === "stellar") {
      if (t === "XLM") str = stellarBalances.xlm;
      if (t === "USDC") str = stellarBalances.usdc;
    } else if (network === "solana") {
      if (t === "SOL") str = solanaBalances.sol;
      if (t === "USDC") str = solanaBalances.usdc;
      if (t === "USDT") str = solanaBalances.usdt;
    }
    const parsed = Number.parseFloat(str);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function balanceFor(token: string): string {
    return formatBalance(getRawBalance(token));
  }

  /** The most that can actually leave the wallet — what MAX fills and Review allows. */
  function spendableFor(token: string): number {
    const t = token.toUpperCase();
    let spendable = getRawBalance(token);
    if (network === "stellar" && t === "XLM") {
      const net = Number.parseFloat(stellarBalances.xlmSpendable ?? "");
      spendable = Number.isFinite(net) ? net : spendable - FALLBACK_XLM_RESERVE;
    }
    return Math.max(0, spendable - (NATIVE_HOLDBACK[t]?.amount ?? 0));
  }

  function fillMax() {
    const max = spendableFor(fromToken);
    if (max <= 0) {
      const holdback = NATIVE_HOLDBACK[fromToken.toUpperCase()];
      setError(
        holdback
          ? `No ${fromToken} available to swap — your balance covers ${holdback.reason}.`
          : `You have no ${fromToken} to swap.`,
      );
      return;
    }
    setError(undefined);
    // Floors to the field's 4 decimals, so MAX never asks for more than is there.
    setAmount(sanitiseSwapAmount(formatBalance(max.toFixed(7))));
  }

  /**
   * Guardrail:
   * - Max 5 whole digits (e.g. up to 99999)
   * - Max 4 decimal digits (e.g. .1234)
   */
  function sanitiseSwapAmount(value: string): string {
    const clean = value.replace(/[^\d.]/g, "");
    if (clean === ".") return "0.";
    const [whole = "", ...rest] = clean.split(".");
    // Limit whole number to max 5 digits
    const cappedWhole = whole.slice(0, 5);
    if (!rest.length) return cappedWhole;
    // Limit decimals to max 4 digits
    const cappedDecimals = rest.join("").slice(0, 4);
    return `${cappedWhole || "0"}.${cappedDecimals}`;
  }

  // ── Direction flip ──
  function flipPair() {
    setFromToken(toToken);
    setToToken(fromToken);
    // If a valid quote was received on the bottom leg, move it to the top input
    if (quote?.amountOut && Number(quote.amountOut) > 0) {
      setAmount(sanitiseSwapAmount(quote.amountOut));
    }
    setError(undefined);
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
          chain: network,
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
    // The wrapper element never changes, so BridgeView is not remounted when
    // its receipt takes over the screen.
    <div
      className={
        bridgeDone
          ? "flex min-h-dvh flex-col max-w-app mx-auto w-full"
          : "flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] max-w-app mx-auto w-full"
      }
    >
      {/* ── Header ── */}
      {bridgeDone ? null : (
        <ScreenHeader
          back="/home"
          onBack={
            mode === "swap" && stage === "review"
              ? () => setStage("quote")
              : undefined
          }
          /* The thumb slides between the two tabs, so the switch reads as one control. */
          center={
            <div className="relative flex items-center rounded-pill border border-jumpa-neutral-100 bg-jumpa-neutral-90 p-1">
              <span
                aria-hidden="true"
                className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-pill bg-jumpa-white shadow-jumpa-sm transition-transform duration-300 ease-jumpa ${mode === "bridge" ? "translate-x-full" : "translate-x-0"
                  }`}
              />
              {MODES.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMode(tab)}
                  aria-pressed={mode === tab}
                  className={`tap relative z-10 w-20 rounded-pill py-1 text-xs font-semibold capitalize transition-colors ${mode === tab
                      ? "text-jumpa-black"
                      : "text-jumpa-neutral-425 hover:text-jumpa-black"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          }
          round
        />
      )}

      {mode === "bridge" ? (
        <BridgeView
          onDone={setBridgeDone}
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
            {/* ── Network selector ── */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-jumpa-black/50">
                Network
              </span>
              <Select
                variant="pill"
                label="Swap network"
                value={network}
                options={networkOptions}
                onValueChange={handleNetworkChange}
                className="capitalize font-semibold"
              />
            </div>

            <div className="flex flex-col gap-4 rounded-surface bg-jumpa-neutral-95 px-2.5 pt-3 pb-2.5">
              <div className="relative flex flex-col gap-1">
                <QuoteLeg
                  label="You send"
                  symbol={fromToken}
                  balance={balanceFor(fromToken)}
                  onMax={fillMax}
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
                      setAmount(sanitiseSwapAmount(e.target.value));
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
                label="Slippage"
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
                  const numAmount = Number(amount);
                  const available = spendableFor(fromToken);
                  const holdback = NATIVE_HOLDBACK[fromToken.toUpperCase()];

                  if (!numAmount || numAmount <= 0) {
                    setError("Enter an amount to swap");
                  } else if (numAmount > available) {
                    setError(
                      holdback && numAmount <= getRawBalance(fromToken)
                        ? `You can swap up to ${formatBalance(available.toFixed(7))} ${fromToken} — the rest covers ${holdback.reason}.`
                        : `Insufficient balance. You have ${formatBalance(getRawBalance(fromToken))} ${fromToken}`,
                    );
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
            {/* lock the quote for 30 secs */}
            <QuoteLockNote seconds={30} />
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
                <DetailRow label="Fee" value={estimatedFee} />
                <DetailRow label="Slippage" value={quoteSlippage} />
                <DetailRow
                  label="Network"
                  value={network === "solana" ? "Solana" : "Stellar"}
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
