import { SwitchHorizontalIcon } from "@/components/ui/icons/switch-horizontal";
import { useFiatRate } from "@/hooks/use-fiat-rate";
import { formatEquivalent, type HubCurrency } from "@/lib/savings-hub";

const TONE = {
  /** A frosted chip on the purple hero. */
  onBrand:
    "gap-1 rounded-pill bg-jumpa-white/15 px-2.5 py-1 text-[11px] leading-3.5 font-medium text-jumpa-primary-50",
  /** Quiet text beside a figure on a white card. */
  plain: "text-[11px] leading-3.5 font-medium text-jumpa-neutral-500",
  /** Trailing an amount input, so it updates as you type. */
  field: "mr-2 text-[11px] leading-3.5 font-medium text-jumpa-neutral-500",
} as const;

/**
 * "≈ $310.34" under a naira figure, "≈ ₦1,740,000" under a USDC one. Renders
 * nothing until the live rate lands and nothing for an empty amount.
 */
export function Equivalent({
  value,
  currency,
  tone = "plain",
}: {
  value: number;
  currency: HubCurrency;
  tone?: keyof typeof TONE;
}) {
  const ngnPerUsd = useFiatRate("NGN");
  if (!ngnPerUsd || !(value > 0)) return null;

  return (
    <span
      className={`inline-flex shrink-0 animate-fade items-center whitespace-nowrap ${TONE[tone]}`}
    >
      {tone === "onBrand" ? (
        <SwitchHorizontalIcon className="size-3 text-jumpa-alt-400" />
      ) : null}
      {formatEquivalent(value, currency, ngnPerUsd)}
    </span>
  );
}
