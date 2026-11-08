"use client";

import { BillChip } from "@/components/bills/bill-chip";
import { FieldError } from "@/components/ui/field-error";
import { AIRTIME_AMOUNTS, AIRTIME_MAX, AIRTIME_MIN } from "@/lib/bills";
import { formatAmount } from "@/lib/transfer";
import { digitsOf } from "@/lib/validation";

/** Why an airtime amount can't be bought, or undefined when it can. */
export function airtimeAmountError(amount: string): string | undefined {
  const value = Number(amount);
  if (!value) return "Choose or type an amount.";
  if (value < AIRTIME_MIN)
    return `The least you can buy is ₦${AIRTIME_MIN.toLocaleString("en-NG")}.`;
  if (value > AIRTIME_MAX)
    return `The most you can buy at once is ₦${AIRTIME_MAX.toLocaleString("en-NG")}.`;
  return undefined;
}

/** Quick amounts and a typed amount; a chip fills the field and lights up while it matches. */
export function AirtimeAmount({
  amount,
  error,
  onChange,
}: {
  /** Whole Naira as digits. */
  amount: string;
  error?: string;
  onChange: (next: string) => void;
}) {
  return (
    <>
      <section className="mt-5.25 flex flex-col gap-2.5">
        <h2 className="text-[13px] leading-none font-medium text-jumpa-ink-muted">
          Amount
        </h2>
        <div className="flex flex-wrap gap-2">
          {AIRTIME_AMOUNTS.map((value) => (
            <BillChip
              key={value}
              active={amount === String(value)}
              onClick={() => onChange(String(value))}
            >
              ₦{value.toLocaleString("en-NG")}
            </BillChip>
          ))}
        </div>
      </section>
      <label className="mt-5.75 flex flex-col gap-2">
        <span className="text-xs leading-none font-medium text-jumpa-ink-muted">
          Or type an amount
        </span>
        <span className="flex h-14 items-center rounded-panel bg-jumpa-neutral-50 px-4 text-sm leading-none text-jumpa-ink">
          ₦
          <input
            value={amount ? formatAmount(amount) : ""}
            onChange={(event) => onChange(digitsOf(event.target.value))}
            inputMode="numeric"
            placeholder={`${AIRTIME_MIN}-${AIRTIME_MAX.toLocaleString("en-NG")}`}
            aria-invalid={Boolean(error)}
            className="min-w-0 flex-1 bg-transparent caret-jumpa-primary-600 outline-none placeholder:text-jumpa-ink-subtle"
          />
        </span>
        <FieldError>{error}</FieldError>
      </label>
    </>
  );
}
