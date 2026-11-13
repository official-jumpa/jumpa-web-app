import Image from "next/image";
import { GLASS } from "@/components/home/balance-panel";
import { ZapIcon } from "@/components/ui/icons/zap";
import { cn } from "@/lib/cn";
import {
  type AutoSaveCadence,
  formatWhole,
  repeatLabel,
} from "@/lib/savings-auto-save";
import { currencySymbol, type SavingsCurrency } from "@/lib/savings-hub";

/** Purple recap of the rule so far: the amount, how often, and the bolt. */
export function AutoSaveCard({
  amount,
  currency,
  cadence,
  intervalMinutes,
}: {
  amount: number;
  currency: SavingsCurrency;
  cadence: AutoSaveCadence;
  intervalMinutes: number;
}) {
  return (
    <section className="relative isolate h-32.25 overflow-hidden rounded-row bg-jumpa-primary-600">
      <CardArt />

      <div className="flex flex-col items-start pt-4.25 pl-5">
        <span
          className={cn(
            "flex h-5.25 items-center rounded-pill px-3 text-xs leading-2.5 font-medium tracking-jumpa-snug text-jumpa-secondary-150",
            GLASS,
          )}
        >
          Your auto-save
        </span>

        <p className="mt-3 h-8.5 leading-0 font-semibold tracking-jumpa-snug whitespace-nowrap">
          <span className="text-xl leading-8.5 text-jumpa-alt-400">
            {currencySymbol(currency)}
          </span>
          <span className="text-[32px] leading-8.5 text-jumpa-white">
            {formatWhole(amount)}
          </span>
        </p>

        <span
          className={cn(
            "mt-3 flex h-5 items-center gap-1 rounded-pill px-2.75 text-[10px] leading-none font-medium tracking-jumpa-snug whitespace-nowrap text-jumpa-secondary-150",
            GLASS,
          )}
        >
          <span
            aria-hidden="true"
            className="inline-block rotate-60 text-[8px] font-bold text-jumpa-alt-400"
          >
            ↑
          </span>
          {repeatLabel({ cadence, intervalMinutes })}, straight to savings
        </span>
      </div>

      <span
        aria-hidden="true"
        className={cn(
          "absolute top-8.75 right-6.75 flex size-14 items-center justify-center rounded-full pl-0.75 text-jumpa-white",
          GLASS,
        )}
      >
        <ZapIcon className="size-6.5" />
      </span>
    </section>
  );
}

/** The hub total card's swirls and orb, without its safe. */
function CardArt() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
    >
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
    </div>
  );
}
