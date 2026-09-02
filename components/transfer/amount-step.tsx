"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { NumericKeypad } from "@/components/auth/numeric-keypad";
import { CloseIcon } from "@/components/ui/icons/close";
import { getAssetLogo } from "@/lib/assets";
import { formatAmount, QUICK_AMOUNTS } from "@/lib/transfer";

const CHIP =
  "tap flex shrink-0 items-center justify-center rounded-pill bg-jumpa-primary-50 " +
  "font-medium text-jumpa-primary-950 active:scale-95";

/** Five chips only fit across the artboard at the tighter size. */
const CHIP_SIZE = {
  dense: "h-6.5 px-2.5 text-[10px] leading-3",
  roomy: "h-9.5 px-4 text-xs leading-4",
} as const;

/** Digits with one dot and two decimals, as the design shows the amount. */
function sanitise(value: string): string {
  const [whole = "", ...rest] = value.replace(/[^\d.]/g, "").split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}

/**
 * Purple amount canvas with the keypad below it. Shared by the bank and wallet
 * flows — only the header above it and what Review opens differ.
 */
export function AmountStep({
  amount,
  symbol,
  balance,
  chips = QUICK_AMOUNTS,
  chipUnit,
  checkBalance = true,
  rate,
  caption,
  onAmountChange,
  onReview,
}: {
  amount: string;
  symbol: string;
  /** Spendable balance, already formatted. MAX fills the field with it. */
  balance: string;
  /** Quick-fill values; the flows differ on whether 5 is offered. */
  chips?: readonly number[];
  /** Unit printed on the chips. The bill flows show bare amounts. */
  chipUnit?: string;
  /**
   * Off for the bill flows: they quote in local currency, so the wallet
   * balance neither gates the amount nor makes a MAX chip meaningful.
   */
  checkBalance?: boolean;
  /** Conversion line opposite the balance, where the flow shows one. */
  rate?: string;
  caption?: ReactNode;
  onAmountChange: (next: string) => void;
  onReview: () => void;
}) {
  const size = CHIP_SIZE[chips.length > 3 ? "dense" : "roomy"];
  const unit = chipUnit ?? symbol;
  const spendable = Number(balance.replace(/[^\d.]/g, ""));
  const low = checkBalance && Number(amount) > spendable;

  const push = (digit: string) =>
    onAmountChange(sanitise(amount === "0" ? digit : amount + digit));

  return (
    <div className="flex flex-1 flex-col rounded-t-dock bg-jumpa-primary-575 px-4.5 pt-6 pb-2.5">
      <p className="text-xs leading-2.5 text-jumpa-primary-50">
        {low ? "Low balance" : "Enter amount"}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        {/* The design's pad is the keyboard here, so the OS one stays down —
            inputMode="none" still lets a physical keyboard and paste through. */}
        <input
          value={formatAmount(amount)}
          onChange={(event) => onAmountChange(sanitise(event.target.value))}
          inputMode="none"
          // biome-ignore lint/a11y/noAutofocus: the screen exists to take this entry
          autoFocus
          placeholder="0.00"
          aria-label="Amount"
          aria-invalid={low}
          className={`min-w-0 flex-1 bg-transparent text-[56px] leading-none font-medium caret-jumpa-alt-400 outline-none placeholder:text-jumpa-primary-500 ${
            low ? "text-jumpa-danger-400" : "text-jumpa-white"
          }`}
        />
        {amount ? (
          <button
            type="button"
            onClick={() => onAmountChange("")}
            aria-label="Clear amount"
            className="tap flex size-6 shrink-0 items-center justify-center rounded-full bg-jumpa-white/25 text-jumpa-white active:scale-90"
          >
            <CloseIcon className="size-2.5" />
          </button>
        ) : null}
      </div>

      <span className="mt-6 -mb-px block h-px w-full bg-jumpa-white/25" />

      <div className="-mx-4.5 mt-4 flex gap-2 overflow-x-auto px-4.5 [scrollbar-width:none]">
        {chips.map((value) => {
          const label = formatAmount(String(value));
          return (
            <button
              key={value}
              type="button"
              onClick={() => onAmountChange(String(value))}
              className={`${CHIP} ${size}`}
            >
              {unit ? `${label} ${unit}` : label}
            </button>
          );
        })}
        {checkBalance ? (
          <button
            type="button"
            onClick={() => onAmountChange(balance.replace(/[^\d.]/g, ""))}
            className={`${CHIP} ${size}`}
          >
            MAX
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2">
          {/* Resolved from the symbol so the glyph can never disagree with it. */}
          <Image
            src={getAssetLogo(symbol)}
            alt=""
            width={20}
            height={20}
            className="size-5 shrink-0 rounded-full object-contain"
          />
          <span className="truncate text-xs leading-5 font-bold text-jumpa-secondary-300">
            {symbol} Balance: {balance}
          </span>
        </p>
        {rate ? (
          <span className="shrink-0 text-[10px] leading-4 font-bold text-jumpa-alt-400">
            {rate}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex flex-col items-center gap-4 pt-8 pb-6">
        <button
          type="button"
          onClick={onReview}
          disabled={!Number(amount) || low}
          className="tap flex h-14 w-full items-center justify-center rounded-pill bg-jumpa-primary-50 text-base leading-4 font-semibold text-jumpa-primary-500 active:scale-[0.98] disabled:opacity-60"
        >
          Review
        </button>
        {caption ? (
          <p className="w-62.75 text-center text-[10px] leading-3.5 font-medium text-jumpa-primary-50">
            {caption}
          </p>
        ) : null}
      </div>

      <NumericKeypad
        onDigit={push}
        onBackspace={() => onAmountChange(amount.slice(0, -1))}
        className="-mx-2 rounded-sheet bg-jumpa-white px-5.75 py-7.5"
      />
    </div>
  );
}
