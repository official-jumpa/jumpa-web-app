"use client";

import { useCallback, useState } from "react";
import {
  CardAmount,
  CardRule,
  CardStats,
  CardTitle,
  ChatCard,
} from "@/components/chat/chat-card";
import type { QuoteCard as Quote } from "@/lib/chat";

//mock data for now

const BASE_RATES: Record<string, number> = {
  "USD-XLM": 5.77,
  "XLM-USD": 1 / 5.77,
  "USDC-XLM": 5.77,
  "XLM-USDC": 1 / 5.77,
  "USD-SOL": 0.0055,
  "SOL-USD": 181.82,
};

interface QuoteCardProps {
  card: Quote;
  isEditable?: boolean;
  onUpdateQuote?: (updatedCard: Quote) => void;
}

/** Live interactive swap quote: editable pay amount and interactive asset toggle button. */
export function QuoteCard({
  card,
  isEditable = true,
  onUpdateQuote,
}: QuoteCardProps) {
  const [fromToken, setFromToken] = useState(card.pay.badge || "USD");
  const [toToken, setToToken] = useState(card.receive.badge || "XLM");
  const [payAmount, setPayAmount] = useState(card.pay.value || "20");
  const [rotated, setRotated] = useState(false);

  // Helper to compute rate
  const getRate = useCallback((from: string, to: string) => {
    const pairKey = `${from}-${to}`;
    return (
      BASE_RATES[pairKey] ||
      (BASE_RATES[`${to}-${from}`] ? 1 / BASE_RATES[`${to}-${from}`] : 5.77)
    );
  }, []);

  const rate = getRate(fromToken, toToken);

  // Compute receive amount
  const numericPay = parseFloat(payAmount) || 0;
  const computedReceive =
    numericPay > 0
      ? (numericPay * rate).toLocaleString("en-US", {
          maximumFractionDigits: 4,
        })
      : "0";

  const notifyChange = (
    newPay: string,
    newFrom: string,
    newTo: string,
    newReceive: string,
    newRate: number,
  ) => {
    if (!onUpdateQuote) return;
    const updatedCard: Quote = {
      ...card,
      pay: {
        ...card.pay,
        value: newPay,
        badge: newFrom,
      },
      receive: {
        ...card.receive,
        value: newReceive,
        badge: newTo,
      },
      stats: [
        {
          lead: "Rate ",
          value: `1 ${newFrom} = ${newRate < 0.1 ? newRate.toFixed(4) : newRate.toFixed(2)} ${newTo}`,
        },
        {
          lead: "Fee ",
          value: `0.01 ${newFrom === "XLM" ? "XLM" : "USD"}`,
        },
      ],
    };
    onUpdateQuote(updatedCard);
  };

  // Handle pay amount changes directly
  const handlePayChange = (newVal: string) => {
    setPayAmount(newVal);
    const num = parseFloat(newVal) || 0;
    const newRec =
      num > 0
        ? (num * rate).toLocaleString("en-US", {
            maximumFractionDigits: 4,
          })
        : "0";
    notifyChange(newVal, fromToken, toToken, newRec, rate);
  };

  // Handle asset toggle directly
  const handleToggle = () => {
    if (!isEditable) return;
    setRotated((prev) => !prev);
    const newFrom = toToken;
    const newTo = fromToken;
    const newRate = getRate(newFrom, newTo);
    const num = parseFloat(payAmount) || 0;
    const newRec =
      num > 0
        ? (num * newRate).toLocaleString("en-US", {
            maximumFractionDigits: 4,
          })
        : "0";

    setFromToken(newFrom);
    setToToken(newTo);
    notifyChange(payAmount, newFrom, newTo, newRec, newRate);
  };

  return (
    <ChatCard>
      <CardTitle title={card.title}>
        <p className="text-[10px] leading-4 text-jumpa-black/50">
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
            value: computedReceive,
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
            value: `1 ${fromToken} = ${rate < 0.1 ? rate.toFixed(4) : rate.toFixed(2)} ${toToken}`,
          },
          {
            lead: "Fee ",
            value: `0.01 ${fromToken === "XLM" ? "XLM" : "USD"}`,
          },
        ]}
      />
    </ChatCard>
  );
}
