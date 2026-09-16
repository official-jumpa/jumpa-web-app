import Image from "next/image";
import { Fragment } from "react";
import { PlusIcon } from "@/components/ui/icons/plus";
import { getAssetLogo } from "@/lib/assets";
import { cn } from "@/lib/cn";
import { REVIEW_MOCK } from "@/lib/landing";

/**
 * The transaction-review sheet the design draws twice — inside the third
 * security card and, on phones, inside the Why Jumpa panel. Its own 422.5-unit
 * frame, so `className` only has to give it a width in the parent's units.
 */
const RULE = "h-1.25 w-full dashed-rule-2.25 text-jumpa-black/5";

export function ReviewMockup({ className }: { className: string }) {
  return (
    <div className={cn("frame-422.5", className)}>
      <div className="flex w-full flex-col items-center gap-27.25 rounded-u-45.25 bg-jumpa-white px-18.25 py-13.5 shadow-landing-mock">
        <span className="h-6.75 w-136 shrink-0 rounded-u-113.25 bg-jumpa-neutral-75" />

        <div className="flex w-full flex-col gap-13.5">
          <div className="flex items-center justify-between">
            <p className="text-u-20.5 font-medium tracking-jumpa text-jumpa-black">
              {REVIEW_MOCK.title}
            </p>
            <span className="flex size-34 shrink-0 items-center justify-center rounded-u-28.5 border-u-1 border-jumpa-neutral-50 bg-jumpa-grey-300">
              <PlusIcon className="size-12.5 rotate-45 text-jumpa-white" />
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex h-31.75 shrink-0 items-center gap-9 rounded-u-36.75 bg-jumpa-secondary-100 px-13.5 text-u-9/22.75 font-medium text-jumpa-primary-950">
              {REVIEW_MOCK.sending.label}
              <span className="flex size-39 shrink-0 items-center justify-center rounded-u-27 border-u-0.75 border-jumpa-black/10 bg-jumpa-primary-525 shadow-landing-disc">
                <Image
                  src={getAssetLogo(REVIEW_MOCK.sending.asset)}
                  alt=""
                  width={128}
                  height={128}
                  className="size-22.75 rounded-full border-u-0.5 border-jumpa-white object-contain"
                />
              </span>
              {REVIEW_MOCK.sending.asset}
            </span>
            <span className="flex min-w-0 items-center gap-11.25">
              <span className="shrink-0 text-u-18/18 font-medium tracking-jumpa text-jumpa-black">
                {REVIEW_MOCK.to.label}
              </span>
              <span className="flex w-106.5 min-w-0 flex-col text-u-9/13.5 text-jumpa-primary-950">
                <span className="truncate font-bold">
                  {REVIEW_MOCK.to.address}
                </span>
                <span className="truncate">{REVIEW_MOCK.to.network}</span>
              </span>
            </span>
          </div>

          <span aria-hidden="true" className={RULE} />

          <div className="flex flex-col gap-9">
            <p className="text-u-6.75/11.25 text-jumpa-black/50">
              {REVIEW_MOCK.recipient.label}
            </p>
            <p className="text-u-36.25 font-medium tracking-jumpa text-jumpa-black">
              {REVIEW_MOCK.recipient.amount}
            </p>
          </div>

          <span aria-hidden="true" className={RULE} />

          <div className="flex w-full flex-col gap-13.5 rounded-u-25 bg-jumpa-primary-50 px-11.25 pt-18.25 pb-11.25">
            {REVIEW_MOCK.rows.map((row, index) => (
              <Fragment key={`${row.label}-${index}`}>
                {index > 0 ? (
                  <span aria-hidden="true" className={RULE} />
                ) : null}
                <div className="flex items-center justify-between px-11.25">
                  <span className="text-u-11.25/18.25 text-jumpa-black/50">
                    {row.label}
                  </span>
                  <span className="text-u-13.5/22.75 font-medium text-jumpa-black">
                    {row.value}
                  </span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>

        <p className="w-full rounded-u-113.25 bg-linear-to-r from-jumpa-primary-500 to-jumpa-primary-600 px-11.25 py-22.75 text-center text-u-18/18 font-semibold tracking-jumpa text-jumpa-alt-400">
          {REVIEW_MOCK.cta}
        </p>
      </div>
    </div>
  );
}
