"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CardAmount,
  CardRule,
  CardStats,
  CardTitle,
  ChatCard,
  StatText,
} from "@/components/chat/chat-card";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import type { QuoteCard as Quote } from "@/lib/chat";

interface QuoteCardProps {
  card: Quote;
  isEditable?: boolean;
  onUpdateQuote?: (updatedCard: Quote) => void;
}

/** Live swap quote: editable pay amount, a direction control on the seam. */
export function QuoteCard({
  card,
  isEditable = true,
  onUpdateQuote,
}: QuoteCardProps) {
  const [fromToken, setFromToken] = useState(card.pay.badge || "XLM");
  const [toToken, setToToken] = useState(card.receive.badge || "USDC");
  const [payAmount, setPayAmount] = useState(card.pay.value || "30");
  const [receiveAmount, setReceiveAmount] = useState(
    card.receive.value || "5.50",
  );
  const [rateText, setRateText] = useState(
    card.stats?.find((s) => s.lead?.includes("Rate"))?.value ||
      "1 XLM = 0.1834 USDC",
  );
  const [feeText, setFeeText] = useState(
    card.stats?.find((s) => s.lead?.includes("Fee"))?.value || "0.00001 XLM",
  );
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [rotated, setRotated] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLiveQuote = useCallback(
    async (amount: string, from: string, to: string) => {
      const num = Number.parseFloat(amount);
      if (Number.isNaN(num) || num <= 0) {
        setReceiveAmount("0.00");
        return;
      }

      setLoadingQuote(true);
      try {
        const res = await fetch("/api/swap/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chain: "stellar",
            assetIn: from,
            assetOut: to,
            amount: amount,
            network: "testnet",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.quote) {
            const q = data.quote;
            setReceiveAmount(q.amountOut);
            setRateText(q.rate);
            setFeeText(q.estimatedFee || "0.00001 XLM");

            if (onUpdateQuote) {
              const updatedCard: Quote = {
                ...card,
                pay: { ...card.pay, value: q.amountIn, badge: from },
                receive: { ...card.receive, value: q.amountOut, badge: to },
                stats: [
                  { lead: "Rate ", value: q.rate },
                  { lead: "Est. Fee ", value: q.estimatedFee || "0.00001 XLM" },
                ],
                _rawQuote: q,
              } as any;
              onUpdateQuote(updatedCard);
            }
          }
        }
      } catch (err) {
        console.warn("[QuoteCard] Error fetching live quote:", err);
      } finally {
        setLoadingQuote(false);
      }
    },
    [card, onUpdateQuote],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handlePayChange = (newVal: string) => {
    setPayAmount(newVal);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchLiveQuote(newVal, fromToken, toToken);
    }, 450);
  };

  const handleToggle = () => {
    if (!isEditable) return;
    setRotated((prev) => !prev);
    const newFrom = toToken;
    const newTo = fromToken;
    setFromToken(newFrom);
    setToToken(newTo);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    fetchLiveQuote(payAmount, newFrom, newTo);
  };

  return (
    <ChatCard>
      <CardTitle title={card.title}>
        <StatText stat={card.status} />
      </CardTitle>

      <CardRule />

      {/* The direction control sits on the seam between the two rows. */}
      <div className="relative flex w-full flex-col gap-2">
        <CardAmount
          row={{
            caption: card.pay.caption || "YOU PAY",
            value: payAmount,
            badge: fromToken,
          }}
          isInput={isEditable}
          inputValue={payAmount}
          onInputChange={handlePayChange}
        />

        <CardAmount
          row={{
            caption: card.receive.caption || "YOU RECEIVE",
            value: loadingQuote ? "Calculating…" : receiveAmount,
            badge: toToken,
          }}
        />

        <button
          type="button"
          onClick={handleToggle}
          disabled={!isEditable}
          aria-label="Swap direction"
          className="tap absolute top-1/2 left-1/2 z-10 flex size-7.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-alt-400 shadow-md active:scale-90 disabled:cursor-default"
        >
          <ArrowUpRightIcon
            className={`size-4 transition-transform duration-300 ${
              rotated ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      <CardRule />

      <CardStats
        stats={[
          { lead: "Rate ", value: rateText },
          { lead: "Fee ", value: feeText },
        ]}
      />
    </ChatCard>
  );
}
