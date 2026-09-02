"use client";

import Link from "next/link";
import { useState } from "react";
import { SwapLeg } from "@/components/swap/swap-leg";
import { CloseButton } from "@/components/transfer/close-button";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { PairPill } from "@/components/transfer/pair-pill";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { Button } from "@/components/ui/button";
import { ArrowDownArrowUpIcon } from "@/components/ui/icons/arrow-down-arrow-up";
import { PlusIcon } from "@/components/ui/icons/plus";
import { DEMO_PIN, SWAP_PAIR, SWAP_QUOTE } from "@/lib/transfer";
import type { Promotion } from "@/lib/wallet";

type Stage = "quote" | "review" | "done";

/** Swap, end to end: quote, review, PIN, receipt. */
export function SwapView({ promotions }: { promotions: Promotion[] }) {
  const [stage, setStage] = useState<Stage>("quote");
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [pair, setPair] = useState(SWAP_PAIR);
  const [amount, setAmount] = useState("100");

  const received = (Number(amount || 0) * SWAP_QUOTE.rate).toFixed(2);
  const rate = `1 ${pair.from.symbol} = ${SWAP_QUOTE.rate} ${pair.to.symbol}`;

  if (stage === "done") {
    return (
      <TransferSuccess
        back="/home"
        title="Swap successful"
        amount={`+${received} ${pair.to.symbol}`}
        titleFirst
        actionsFirst
        promotions={promotions}
        ctaLabel="Back to home"
        details={
          <DetailList tone="secondary">
            <DetailRow label="Provider" value={SWAP_QUOTE.provider} />
            <DetailRow label="Network fee" value={SWAP_QUOTE.networkFee} />
            <DetailRow
              label="Slippage"
              value={SWAP_QUOTE.slippage}
              rule={false}
            />
          </DetailList>
        }
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col px-4 pt-3.25 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      {stage === "review" ? (
        <TransferHeader back="/swap" title="Review swap" />
      ) : (
        <header className="relative flex h-9.5 items-center justify-between">
          <CloseButton onClick={() => history.back()} label="Close swap" />
          <h1 className="pointer-events-none absolute inset-x-24 text-center text-lg leading-4 font-medium text-jumpa-black">
            Swap
          </h1>
          <Link
            href="/home/chat"
            aria-label="Swap with Jumpa chat"
            className="tap flex size-9.5 items-center justify-center rounded-full border border-jumpa-primary-600 bg-jumpa-secondary-150 text-jumpa-primary-600 active:scale-90"
          >
            <PlusIcon className="size-5.25" />
          </Link>
        </header>
      )}

      {stage === "quote" ? (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-surface bg-jumpa-neutral-95 px-2.5 pt-3 pb-2.5">
            {/* The direction button sits on the seam between the two legs. */}
            <div className="relative flex flex-col gap-1">
              <SwapLeg
                label="You send"
                symbol={pair.from.symbol}
                balance={pair.from.balance}
                onSymbolChange={(symbol) =>
                  setPair({ ...pair, from: { ...pair.from, symbol } })
                }
              >
                <input
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value.replace(/[^\d.]/g, ""))
                  }
                  inputMode="decimal"
                  aria-label="Amount to swap"
                  className="w-full min-w-0 bg-transparent text-base leading-4 font-medium text-jumpa-black caret-jumpa-primary-600 outline-none"
                />
              </SwapLeg>

              <button
                type="button"
                onClick={() => setPair({ from: pair.to, to: pair.from })}
                aria-label="Swap direction"
                className="tap absolute top-1/2 left-1/2 flex size-8.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[0.66px] border-jumpa-black/10 bg-jumpa-primary-525 text-jumpa-alt-400 shadow-[0_0_16px_rgba(0,0,0,0.35)] active:scale-90"
              >
                <ArrowDownArrowUpIcon className="size-4" />
              </button>

              <SwapLeg
                label="You receive"
                symbol={pair.to.symbol}
                balance={pair.to.balance}
                onSymbolChange={(symbol) =>
                  setPair({ ...pair, to: { ...pair.to, symbol } })
                }
              >
                <span className="text-base leading-4 font-medium text-jumpa-black">
                  {received}
                </span>
              </SwapLeg>
            </div>

            <span className="-mb-px block h-px w-full bg-jumpa-neutral-200" />

            <p className="flex items-center justify-between gap-3 px-2.5 text-[10px] leading-4 text-jumpa-black/50">
              <span>
                Rate <b className="font-bold text-jumpa-black">{rate}</b>
              </span>
              <span>
                Fee{" "}
                <b className="font-bold text-jumpa-black">
                  0.3 {pair.to.symbol}
                </b>
              </span>
            </p>
          </div>

          <DetailList tone="secondary">
            <DetailRow label="Network fee" value={SWAP_QUOTE.networkFee} />
            <DetailRow
              label="Slippage"
              value={SWAP_QUOTE.slippage}
              rule={false}
            />
          </DetailList>

          <Button
            variant="gradient"
            size="lg"
            disabled={!Number(amount)}
            onClick={() => setStage("review")}
          >
            Review swap
          </Button>

          <p className="mx-auto w-42 text-center text-[10px] leading-3.5 text-jumpa-black">
            Your quote is locked for {SWAP_QUOTE.lockSeconds} seconds. After
            that, you&rsquo;ll need to get a new quote.
          </p>
        </div>
      ) : null}

      {stage === "review" && !pinOpen ? (
        <ReviewSheet
          summary={
            <div className="flex items-center justify-between gap-3">
              <PairPill
                left={pair.from.symbol}
                right={pair.to.symbol}
                media={<ArrowDownArrowUpIcon className="size-4 -rotate-90" />}
              />
              <span className="shrink-0 text-[10px] leading-4 text-jumpa-black/50">
                Rate <b className="font-bold text-jumpa-black">{rate}</b>
              </span>
            </div>
          }
          headlineLabel="YOU RECEIVE"
          headline={`${received} ${pair.to.symbol}`}
          confirmLabel="Confirm swap"
          onConfirm={() => setPinOpen(true)}
          onClose={() => setStage("quote")}
        >
          <DetailList tone="secondary">
            <DetailRow label="Provider" value={SWAP_QUOTE.provider} />
            <DetailRow label="Network fee" value={SWAP_QUOTE.networkFee} />
            <DetailRow label="Slippage" value={SWAP_QUOTE.slippage} />
            <DetailRow
              label="Settlement time"
              value={SWAP_QUOTE.settlement}
              rule={false}
            />
          </DetailList>
        </ReviewSheet>
      ) : null}

      {pinOpen ? (
        <TransferPinSheet
          error={pinError}
          onRetry={() => setPinError(false)}
          onClose={() => setPinOpen(false)}
          onComplete={(pin) => {
            if (pin === DEMO_PIN) setStage("done");
            else setPinError(true);
          }}
        />
      ) : null}
    </div>
  );
}
