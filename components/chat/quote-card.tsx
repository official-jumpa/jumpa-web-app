"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CardAmount,
  CardRule,
  CardStats,
  CardTitle,
  ChatCard,
} from "@/components/chat/chat-card";
import type { QuoteCard as Quote } from "@/lib/chat";

interface QuoteCardProps {
  card: Quote;
  isEditable?: boolean;
  onUpdateQuote?: (updatedCard: Quote) => void;
}

/** Live interactive swap quote: editable pay amount and interactive asset toggle button with real DEX refetching. */
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

  // Fetch real live quote from backend
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

  // Handle pay amount input changes with debounce
  const handlePayChange = (newVal: string) => {
    setPayAmount(newVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchLiveQuote(newVal, fromToken, toToken);
    }, 450);
  };

  // Handle asset toggle directly
  const handleToggle = () => {
    if (!isEditable) return;
    setRotated((prev) => !prev);
    const newFrom = toToken;
    const newTo = fromToken;
    setFromToken(newFrom);
    setToToken(newTo);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    fetchLiveQuote(payAmount, newFrom, newTo);
  };

  return (
    <ChatCard>
      <CardTitle title={card.title}>
        <p className="text-xs leading-4 text-jumpa-black/50">
          {card.status.lead}
          <span className="font-bold text-jumpa-black">
            {card.status.value}
          </span>
        </p>
      </CardTitle>

      <CardRule />

      <div className="relative flex w-full flex-col gap-2">
        {/* You Pay row (Editable) */}
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

        {/* You Receive row */}
        <CardAmount
          row={{
            caption: card.receive.caption || "YOU RECEIVE",
            value: loadingQuote ? "Calculating..." : receiveAmount,
            badge: toToken,
          }}
        />

        {/* Interactive Swap Button */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={!isEditable}
          aria-label="Toggle swap assets"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex size-9 items-center justify-center rounded-full bg-jumpa-primary-600 shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer disabled:cursor-default"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#D5FF19"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${
              rotated ? "rotate-180" : ""
            }`}
          >
            <path d="M7 10l5-5 5 5" />
            <path d="M17 14l-5 5-5-5" />
          </svg>
        </button>
      </div>

      <CardRule />

      <CardStats
        stats={[
          {
            lead: "Rate ",
            value: rateText,
          },
          {
            lead: "Fee ",
            value: feeText,
          },
        ]}
      />
    </ChatCard>
  );
}
