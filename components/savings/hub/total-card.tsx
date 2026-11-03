import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

/** Frosted chip over the purple card. */
const GLASS = "bg-jumpa-white/5 inset-ring inset-ring-jumpa-white/35";

/** The hub's purple total: badge, figure and interest on the left, the safe on the right. */
export function TotalCard({
  symbol,
  figure,
  interest,
  toggle,
  motion,
}: {
  symbol: string;
  figure: string;
  /** Interest across the shown plans, already formatted with its symbol. */
  interest: string;
  /** The currency switch in the top-right corner. */
  toggle: ReactNode;
  /** Slides the amount in when the currency changes; `key` restarts it. */
  motion?: { key: string; className?: string; style?: CSSProperties };
}) {
  return (
    <section className="relative isolate h-32.25 overflow-hidden rounded-row bg-jumpa-primary-600">
      <TotalCardArt />

      <div className="flex flex-col items-start pt-4.25 pl-5">
        <span
          className={`flex h-7 items-center rounded-pill px-3.25 text-xs leading-2.5 font-medium tracking-jumpa-snug text-jumpa-white ${GLASS}`}
        >
          Total savings
        </span>

        <p
          key={motion?.key}
          style={motion?.style}
          className={`mt-2.5 h-8.5 leading-0 font-semibold tracking-jumpa-snug whitespace-nowrap ${motion?.className ?? ""}`}
        >
          <span className="text-xl leading-8.5 text-jumpa-alt-400">
            {symbol}
          </span>
          <span className="text-[32px] leading-8.5 text-jumpa-white">
            {figure}
          </span>
        </p>

        <span
          className={`mt-2 flex h-5 items-center gap-1 rounded-pill px-2.75 text-[10px] leading-none font-medium tracking-jumpa-snug whitespace-nowrap ${GLASS}`}
        >
          <span
            aria-hidden="true"
            className="inline-block rotate-60 text-[8px] font-bold text-jumpa-alt-400"
          >
            ↑
          </span>
          <span className="text-jumpa-alt-400">+{interest}</span>
          <span className="text-jumpa-white">interest earned</span>
        </span>
      </div>

      <div className="absolute top-4.25 right-3">{toggle}</div>
    </section>
  );
}

/** Swirls pinned right, the orb pinned left, and the safe in the bottom-right corner. */
function TotalCardArt() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
    >
      <Image
        src="/images/savings/card-swirl-lg.svg"
        alt=""
        width={320}
        height={213}
        className="absolute -top-5.5 -right-8.5 max-w-none rotate-[15.12deg]"
      />
      <Image
        src="/images/savings/card-swirl-md.svg"
        alt=""
        width={245}
        height={163}
        className="absolute top-6 -right-21.75 max-w-none -rotate-[1.12deg]"
      />
      <Image
        src="/images/home/card-swirl.svg"
        alt=""
        width={225}
        height={150}
        className="absolute top-12.5 -right-3.5 max-w-none rotate-[10.54deg]"
      />
      <Image
        src="/images/home/card-orb.svg"
        alt=""
        width={139}
        height={139}
        className="absolute top-3.25 -left-4.5 max-w-none -rotate-[41.32deg]"
      />
      <Image
        src="/images/savings/safe-coins.webp"
        alt=""
        width={150}
        height={100}
        priority
        className="absolute top-8 -right-0.5 w-37.5 max-w-none"
      />
    </div>
  );
}
