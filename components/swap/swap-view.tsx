"use client";

import { useState } from "react";
import { SwapLeg, formatBalance } from "@/components/swap/swap-leg";
import { SwapSettingsSheet } from "@/components/swap/swap-settings-sheet";
import { CloseButton } from "@/components/transfer/close-button";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { PairPill } from "@/components/transfer/pair-pill";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { ArrowDownArrowUpIcon } from "@/components/ui/icons/arrow-down-arrow-up";
import { PlusIcon } from "@/components/ui/icons/plus";
import { TriangleWarningIcon } from "@/components/ui/icons/triangle-warning";
import { useSwapQuote } from "@/hooks/use-swap-quote";
import type { Promotion } from "@/lib/wallet";

/** Assets available on each chain/network. Extend when new chains are integrated. */
const CHAIN_ASSETS = {
  "stellar:testnet": ["XLM", "USDC"] as const,
  "stellar:mainnet": ["XLM", "USDC"] as const,
} as const;

type Stage = "quote" | "review" | "done";

interface TxResult {
  txHash: string;
  explorerUrl: string;
  received: string;
  receivedToken: string;
}

export interface StellarTestnetBalances {
  xlm: string;
  usdc: string;
}

export function SwapView({
  promotions,
  stellarTestnetBalances,
}: {
  promotions: Promotion[];
  stellarTestnetBalances: StellarTestnetBalances;
}) {
  // ── Settings ──
  const [network, setNetwork] = useState<"testnet" | "mainnet">("testnet");
  const [slippage, setSlippage] = useState(0.5);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Swap pair ──
  const assets = CHAIN_ASSETS[`stellar:${network}`];
  const [fromToken, setFromToken] = useState<string>(assets[0]);
  const [toToken, setToToken] = useState<string>(assets[1]);
  const [amount, setAmount] = useState("");

  // ── Flow ──
  const [stage, setStage] = useState<Stage>("quote");
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [error, setError] = useState<string>();
  const [txResult, setTxResult] = useState<TxResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Live quote ──
  const { quote, loading: quoteLoading, error: quoteError } = useSwapQuote({
    fromToken,
    toToken,
    amount,
    network,
    slippage,
  });

  const received = quote?.amountOut ?? "—";
  const rate = quote?.rate ?? (quoteLoading ? "Fetching…" : "—");
  const estimatedFee = quote?.estimatedFee ?? "0.00001 XLM";
  const quoteSlippage = quote?.slippage ?? `${slippage}%`;

  // ── Balance lookup ──
  function balanceFor(token: string): string {
    const t = token.toUpperCase();
    if (t === "XLM") return formatBalance(stellarTestnetBalances.xlm);
    if (t === "USDC") return formatBalance(stellarTestnetBalances.usdc);
    return "0";
  }

  // ── Direction flip ──
  function flipPair() {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount("");
  }

  // ── PIN submission — calls /api/swap/execute ──
  async function handlePinSubmit(pin: string) {
    if (!quote) {
      setPinError(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/swap/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          rawQuote: quote.rawQuote,
          network,
          fromToken,
          toToken,
          fromAmount: amount,
          toAmount: quote.amountOut,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("[SwapView] Execute error:", json?.error);
        setPinError(true);
      } else {
        setTxResult({
          txHash: json.txHash,
          explorerUrl: json.explorerUrl,
          received: quote.amountOut,
          receivedToken: toToken,
        });
        setStage("done");
        setPinOpen(false);
      }
    } catch (e) {
      console.error("[SwapView] Network error:", e);
      setPinError(true);
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
        promotions={promotions}
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
    <div className="flex min-h-dvh flex-col px-4 pt-3.25 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      {/* ── Header ── */}
      {stage === "review" ? (
        <TransferHeader back="/swap" title="Review swap" />
      ) : (
        <header className="relative flex h-9.5 items-center justify-between">
          <CloseButton onClick={() => history.back()} label="Close swap" />
          <h1 className="pointer-events-none absolute inset-x-24 text-center text-lg leading-4 font-medium text-jumpa-black">
            Swap
          </h1>
          <button
            type="button"
            aria-label="Swap settings"
            onClick={() => setSettingsOpen(true)}
            className="tap flex size-9.5 items-center justify-center rounded-full border border-jumpa-primary-600 bg-jumpa-secondary-150 text-jumpa-primary-600 active:scale-90"
          >
            <PlusIcon className="size-5.25" />
          </button>
        </header>
      )}

      {/* ── Settings sheet (network + slippage) ── */}
      {settingsOpen && (
        <SwapSettingsSheet
          network={network}
          slippage={slippage}
          onNetworkChange={(n) => {
            setNetwork(n);
            setAmount("");
          }}
          onSlippageChange={setSlippage}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* ── Quote stage ── */}
      {stage === "quote" ? (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-surface bg-jumpa-neutral-95 px-2.5 pt-3 pb-2.5">
            <div className="relative flex flex-col gap-1">
              <SwapLeg
                label="You send"
                symbol={fromToken}
                balance={balanceFor(fromToken)}
                assets={assets}
                onSymbolChange={(s) => {
                  if (s === toToken) flipPair();
                  else setFromToken(s);
                }}
              >
                <input
                  value={amount}
                  onChange={(e) => {
                    setError(undefined);
                    setAmount(e.target.value.replace(/[^\d.]/g, ""));
                  }}
                  inputMode="decimal"
                  aria-label="Amount to swap"
                  className="w-full min-w-0 bg-transparent text-xl leading-6 font-medium text-jumpa-black caret-jumpa-primary-600 outline-none"
                  placeholder="0"
                />
              </SwapLeg>

              <button
                type="button"
                onClick={flipPair}
                aria-label="Swap direction"
                className="tap absolute top-1/2 left-1/2 flex size-8.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[0.66px] border-jumpa-black/10 bg-jumpa-primary-525 text-jumpa-alt-400 shadow-[0_0_16px_rgba(0,0,0,0.35)] active:scale-90"
              >
                <ArrowDownArrowUpIcon className="size-4" />
              </button>

              <SwapLeg
                label="You receive"
                symbol={toToken}
                balance={balanceFor(toToken)}
                assets={assets}
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
              </SwapLeg>
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
                Fee{" "}
                <b className="font-bold text-jumpa-black">{estimatedFee}</b>
              </span>
            </p>
          </div>

          <DetailList tone="secondary">
            <DetailRow label="Network fee" value={estimatedFee} />
            <DetailRow
              label="Slippage"
              value={quoteSlippage}
              rule={false}
            />
          </DetailList>

          {quoteError && (
            <FieldError>{quoteError}</FieldError>
          )}

          <div className="flex flex-col items-center gap-3">
            <FieldError>{error}</FieldError>
            <Button
              variant="gradient"
              size="lg"
              onClick={() => {
                if (!Number(amount)) {
                  setError("Enter an amount to swap.");
                } else if (!quote) {
                  setError("Waiting for a quote. Please try again in a moment.");
                } else {
                  setStage("review");
                }
              }}
            >
              Review swap
            </Button>
          </div>

          <p className="mx-auto flex max-w-72 items-start justify-center text-xs leading-4 text-jumpa-black text-center">
            <TriangleWarningIcon className="mt-px size-4 shrink-0 text-jumpa-warning" />
            <span>
              Your quote is locked for 30 seconds. After that, you'll need to get a new quote
            </span>
          </p>
        </div>
      ) : null}

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
          confirmLabel="Confirm swap"
          onConfirm={() => setPinOpen(true)}
          onClose={() => setStage("quote")}
        >
          <DetailList tone="secondary">
            <DetailRow label="Network fee" value={estimatedFee} />
            <DetailRow label="Slippage" value={quoteSlippage} />
            <DetailRow
              label="Network"
              value={`Stellar ${network}`}
              rule={false}
            />
          </DetailList>
        </ReviewSheet>
      ) : null}

      {/* ── PIN sheet ── */}
      {pinOpen ? (
        <TransferPinSheet
          error={pinError}
          onRetry={() => setPinError(false)}
          onClose={() => {
            setPinOpen(false);
            setPinError(false);
          }}
          onComplete={handlePinSubmit}
        />
      ) : null}
    </div>
  );
}
