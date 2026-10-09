import {
  SAVINGS_INPUT,
  SavingsField,
} from "@/components/savings/savings-field";
import { currencySymbol, type HubCurrency } from "@/lib/savings-hub";
import { formatAmount, sanitiseAmount } from "@/lib/transfer";
import { Equivalent } from "./equivalent";

/** Plausible figures per field, so two money fields never show the same hint. */
const EXAMPLES = {
  target: { NGN: "1,500,000", USDC: "2,500" },
  deposit: { NGN: "50,000", USDC: "100" },
} as const satisfies Record<string, Record<HubCurrency, string>>;

/** Amount input with the currency's symbol in front; holds raw digits, shows them grouped. */
export function MoneyField({
  label,
  currency,
  value,
  onChange,
  error,
  example = "deposit",
  autoFocus,
}: {
  label: string;
  currency: HubCurrency;
  /** Raw, ungrouped: "500000.5". */
  value: string;
  onChange: (next: string) => void;
  error?: string;
  /** Which figure the placeholder suggests. */
  example?: keyof typeof EXAMPLES;
  autoFocus?: boolean;
}) {
  return (
    <SavingsField label={label} error={error}>
      <span className="text-sm leading-4 font-semibold text-jumpa-primary-600">
        {currencySymbol(currency)}
      </span>
      <input
        inputMode="decimal"
        autoComplete="off"
        // biome-ignore lint/a11y/noAutofocus: the sheet exists to take this entry
        autoFocus={autoFocus}
        value={formatAmount(value)}
        onChange={(event) => onChange(sanitiseAmount(event.target.value))}
        placeholder={EXAMPLES[example][currency]}
        aria-invalid={error ? true : undefined}
        className={SAVINGS_INPUT}
      />
      <Equivalent value={Number(value)} currency={currency} tone="field" />
    </SavingsField>
  );
}
