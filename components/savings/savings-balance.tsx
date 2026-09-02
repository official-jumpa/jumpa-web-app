import Image from "next/image";

/**
 * The purple total on a product's own landing: a label pill, the amount, and
 * the rate badge in the corner.
 */
export function SavingsBalance({
  badge,
  amount,
  rate,
}: {
  badge: string;
  amount: string;
  rate?: string;
}) {
  return (
    <div className="relative flex h-31.25 items-center justify-center overflow-hidden rounded-key bg-[linear-gradient(to_bottom,var(--color-jumpa-primary-600),var(--color-jumpa-primary-700))]">
      <Image
        src="/images/savings/lock-grid.svg"
        alt=""
        aria-hidden="true"
        width={357}
        height={328}
        className="pointer-events-none absolute top-[-102.2px] left-0 max-w-none"
      />

      <div className="relative flex flex-col items-center gap-3">
        <span className="rounded-pill bg-jumpa-primary-950 px-2.75 py-1 text-[8px] leading-2.5 text-jumpa-white">
          {badge}
        </span>
        <p className="flex items-baseline text-jumpa-primary-50">
          <span className="text-2xl leading-9.75 font-semibold">$</span>
          <span className="text-4xl leading-9.75 font-semibold">{amount}</span>
        </p>
      </div>

      {rate ? (
        <span className="absolute top-2 right-2 rounded-pill border border-jumpa-white/43 bg-jumpa-white/30 px-2.5 py-2.5 text-[10px] leading-3 font-medium text-jumpa-white">
          {rate}
        </span>
      ) : null}
    </div>
  );
}
