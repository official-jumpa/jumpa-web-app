import Image from "next/image";

/**
 * The purple total on a product's own landing: a label pill, the amount, and
 * the rate the product pays along the foot.
 *
 * The rate used to be a bare "1.5% p.a." pill floating in the top-right corner,
 * which read as a stray number — nothing said what it was a rate *of*. It is a
 * labelled block on the brand lime now, which is also the only thing on this
 * card with enough contrast to compete with a 36px amount.
 */
export function SavingsBalance({
  badge,
  amount,
  rate,
}: {
  badge: string;
  amount: string;
  /** "2.50% – 14.49%" — the range the product advertises. */
  rate?: string;
}) {
  return (
    <div className="relative flex flex-col overflow-hidden rounded-key bg-[linear-gradient(to_bottom,var(--color-jumpa-primary-600),var(--color-jumpa-primary-700))]">
      <Image
        src="/images/savings/lock-grid.svg"
        alt=""
        aria-hidden="true"
        width={357}
        height={328}
        className="pointer-events-none absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
      />

      <div className="relative flex h-31.25 flex-col items-center justify-center gap-3">
        <span className="rounded-pill bg-jumpa-primary-950 px-2.75 py-1 text-[10px] leading-3 text-jumpa-white">
          {badge}
        </span>
        <p className="flex items-baseline text-jumpa-primary-50">
          <span className="text-2xl leading-9.75 font-semibold">$</span>
          <span className="text-4xl leading-9.75 font-semibold">{amount}</span>
        </p>
      </div>

      {rate ? (
        <div className="relative flex items-end justify-between gap-2 border-t border-jumpa-white/20 px-4 pt-2.5 pb-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-[10px] leading-3 font-medium tracking-wider text-jumpa-primary-100 uppercase">
              Earn
            </span>
            <span className="text-sm leading-4 font-semibold text-jumpa-alt-400">
              {rate}
            </span>
          </span>
          <span className="text-[10px] leading-3 text-jumpa-primary-100">
            per year
          </span>
        </div>
      ) : null}
    </div>
  );
}
