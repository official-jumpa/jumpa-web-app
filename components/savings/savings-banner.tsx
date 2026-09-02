import Image from "next/image";
import { SAVINGS_SUMMARY } from "@/lib/savings";

/**
 * Purple masthead on the savings landing. With goals in play it reports the
 * total; empty, it shows the artwork instead. The two notches curve the sheet
 * below back up into the gradient.
 */
export function SavingsBanner({
  title,
  progress,
}: {
  title: string;
  progress?: boolean;
}) {
  return (
    <div className="-mx-4.5">
      <div className="relative flex h-38.75 flex-col justify-center overflow-hidden bg-[linear-gradient(to_bottom,var(--color-jumpa-primary-600),var(--color-jumpa-primary-400))] p-6">
        <Image
          src="/images/savings/hero-grid.svg"
          alt=""
          aria-hidden="true"
          width={347}
          height={319}
          className="pointer-events-none absolute top-[-81.6px] left-1.5 max-w-none"
        />
        {progress ? null : (
          <Image
            src="/images/savings/hero-art.svg"
            alt=""
            aria-hidden="true"
            width={270}
            height={347}
            className="pointer-events-none absolute top-[-56px] left-[39.06%] max-w-none"
          />
        )}

        <h2 className="relative text-lg leading-4 font-extrabold text-jumpa-secondary-50">
          {title}
        </h2>

        {progress ? (
          <div className="relative mt-4 flex flex-col gap-1.5 text-jumpa-secondary-50">
            <div className="flex items-center justify-between text-[10px] leading-3.5 font-medium">
              <span>{SAVINGS_SUMMARY.goals} active goals</span>
              <span>
                {SAVINGS_SUMMARY.saved}/{SAVINGS_SUMMARY.target}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-pill bg-jumpa-white/30">
              <div
                className="h-full rounded-pill bg-jumpa-alt-400"
                style={{ width: `${SAVINGS_SUMMARY.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[8px] leading-2.5 font-semibold">
              <span>{SAVINGS_SUMMARY.percent}%</span>
              <span>{SAVINGS_SUMMARY.remaining} left</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between px-4.5">
        <Image
          src="/images/savings/notch-left.svg"
          alt=""
          aria-hidden="true"
          width={18}
          height={18}
        />
        <Image
          src="/images/savings/notch-right.svg"
          alt=""
          aria-hidden="true"
          width={18}
          height={18}
        />
      </div>
    </div>
  );
}
