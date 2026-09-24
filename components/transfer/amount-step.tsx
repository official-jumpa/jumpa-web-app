"use client";

import Image from "next/image";
import { type ReactNode, useState } from "react";
import { NumericKeypad } from "@/components/auth/numeric-keypad";
import { CanvasError } from "@/components/ui/field-error";
import { CloseIcon } from "@/components/ui/icons/close";
import { getAssetLogo } from "@/lib/assets";
import { formatAmount, QUICK_AMOUNTS, sanitiseAmount } from "@/lib/transfer";

const CHIP =
  "tap flex shrink-0 items-center justify-center rounded-pill bg-jumpa-primary-50 " +
  "font-medium text-jumpa-primary-950 active:scale-95";

/** Five chips only fit across the artboard at the tighter size. */
const CHIP_SIZE = {
  dense: "h-6.5 px-2.5 text-[10px] leading-3",
  roomy: "h-9.5 px-4 text-xs leading-4",
} as const;

/**
 * Purple amount canvas with the keypad below it. Shared by the bank and wallet
 * flows — only the header above it and what Review opens differ.
 */
export function AmountStep({
  amount,
  symbol,
  balance,
  logo,
  chips = QUICK_AMOUNTS,
  chipUnit,
  checkBalance = true,
  maxAmount,
  min,
  max,
  limitUnit = "",
  inputPrefix,
  rate,
  caption,
  ctaLabel = "Proceed",
  currencyMode,
  currencyOptions,
  onCurrencyModeChange,
  onAmountChange,
  onReview,
}: {
  amount: string;
  symbol: string;
  /** Spendable balance, already formatted. MAX fills the field with it. */
  balance: string;
  /**
   * Overrides the mark beside the balance. The bill rails spend naira, not a
   * token, so they pass a flag — `getAssetLogo` has no entry for a currency.
   */
  logo?: string;
  /** Quick-fill values; the flows differ on whether 5 is offered. */
  chips?: readonly number[];
  /** Unit printed on the chips. The bill flows show bare amounts. */
  chipUnit?: string;
  /**
   * Off for the bill flows: they quote in local currency, so the wallet
   * balance neither gates the amount nor makes a MAX chip meaningful.
   */
  checkBalance?: boolean;
  /** Optional override for the numeric max value when typing in alternate currency. */
  maxAmount?: string | number;
  /** What the rail itself accepts, where it has bounds (airtime is 50–50,000). */
  min?: number;
  max?: number;
  /** Printed with the bounds, e.g. "₦". */
  limitUnit?: string;
  /** Optional currency symbol/prefix before amount (e.g. ₦ or $) */
  inputPrefix?: string;
  /** Conversion line opposite the balance, where the flow shows one. */
  rate?: string;
  caption?: ReactNode;
  /** Every flow reads "Proceed"; only the receipts override it. */
  ctaLabel?: string;
  /** Currency mode selector state */
  currencyMode?: "crypto" | "fiat";
  currencyOptions?: readonly { value: "crypto" | "fiat"; label: string }[];
  onCurrencyModeChange?: (mode: "crypto" | "fiat") => void;
  onAmountChange: (next: string) => void;
  onReview: () => void;
}) {
  const [error, setError] = useState<string>();

  const size = CHIP_SIZE[chips.length > 3 ? "dense" : "roomy"];
  const unit = chipUnit ?? symbol;
  const spendable =
    maxAmount !== undefined
      ? Number(String(maxAmount).replace(/[^\d.]/g, ""))
      : Number(balance.replace(/[^\d.]/g, ""));
  const low = checkBalance && Number(amount) > spendable;
  const entered = Number(amount);
  const over = max !== undefined && entered > max;
  const under = min !== undefined && entered > 0 && entered < min;
  const minLabel =
    min === undefined ? "" : `${limitUnit}${formatAmount(String(min))}`;
  const maxLabel =
    max === undefined ? "" : `${limitUnit}${formatAmount(String(max))}`;
  // Same treatment as a low balance: the digits tint and the label says why,
  // so an out-of-range amount cannot be read as accepted.
  const bad = low || over || under;

  const change = (next: string) => {
    setError(undefined);
    onAmountChange(next);
  };

  const push = (digit: string) => {
    if (digit === ".") {
      if (amount.includes(".")) return;
      change(amount ? `${amount}.` : "0.");
      return;
    }
    change(sanitiseAmount(amount === "0" ? digit : amount + digit));
  };

  const review = () => {
    if (!Number(amount)) return setError("Enter an amount greater than 0");
    if (under) return setError(`The smallest amount is ${minLabel}`);
    if (over) return setError(`The largest amount is ${maxLabel}`);
    if (low)
      return setError(`Insufficient balance. You have ${balance} available`);
    onReview();
  };

  return (
    <div className="flex flex-1 flex-col rounded-t-dock bg-jumpa-primary-575 px-4.5 pt-6 pb-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs leading-2.5 text-jumpa-primary-50">
          {over
            ? `Maximum ${maxLabel}`
            : under
              ? `Minimum ${minLabel}`
              : low
                ? "Low balance"
                : "Enter amount"}
        </p>
        {onCurrencyModeChange && currencyOptions ? (
          <div className="inline-flex rounded-pill bg-jumpa-white/15 p-0.5">
            {currencyOptions.map((opt) => {
              const selected = opt.value === currencyMode;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onCurrencyModeChange(opt.value)}
                  className={`tap rounded-pill px-2.5 py-1 text-[10px] leading-3 font-semibold transition-all ${
                    selected
                      ? "bg-jumpa-white text-jumpa-primary-600 shadow-sm"
                      : "text-jumpa-primary-50 hover:text-jumpa-white"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        {/* The design's pad is the keyboard here, so the OS one stays down —
            inputMode="none" still lets a physical keyboard and paste through. */}
        <div className="flex min-w-0 flex-1 items-center">
          {inputPrefix ? (
            <span
              className={`mr-1 select-none text-[36px] font-medium leading-none ${
                bad ? "text-jumpa-danger-400" : "text-jumpa-primary-50/70"
              }`}
            >
              {inputPrefix}
            </span>
          ) : null}
          <input
            value={formatAmount(amount)}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === ".") {
                change("0.");
                return;
              }
              change(sanitiseAmount(raw));
            }}
            inputMode="none"
            // biome-ignore lint/a11y/noAutofocus: the screen exists to take this entry
            autoFocus
            placeholder="0.00"
            aria-label="Amount"
            aria-invalid={bad}
            className={`min-w-0 flex-1 bg-transparent text-[56px] leading-none font-medium caret-jumpa-alt-400 outline-none placeholder:text-jumpa-primary-500 ${
              bad ? "text-jumpa-danger-400" : "text-jumpa-white"
            }`}
          />
        </div>
        {amount ? (
          <button
            type="button"
            onClick={() => change("")}
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
              onClick={() => change(String(value))}
              className={`${CHIP} ${size}`}
            >
              {unit ? `${label} ${unit}` : label}
            </button>
          );
        })}
        {checkBalance ? (
          <button
            type="button"
            onClick={() =>
              change(
                maxAmount !== undefined
                  ? String(maxAmount).replace(/[^\d.]/g, "")
                  : balance.replace(/[^\d.]/g, ""),
              )
            }
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
            src={logo ?? getAssetLogo(symbol)}
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
          onClick={review}
          className="tap flex h-14 w-full items-center justify-center rounded-pill bg-jumpa-primary-50 text-base leading-4 font-semibold text-jumpa-primary-500 active:scale-[0.98]"
        >
          {ctaLabel}
        </button>
        <CanvasError>{error}</CanvasError>
        {caption ? (
          <p className="w-62.75 text-center text-[10px] leading-3.5 font-medium text-jumpa-primary-50">
            {caption}
          </p>
        ) : null}
      </div>

      <NumericKeypad
        onDigit={push}
        onBackspace={() => change(amount.slice(0, -1))}
        withDecimal
        className="-mx-2 rounded-sheet bg-jumpa-white px-5.75 py-7.5"
      />
    </div>
  );
}
