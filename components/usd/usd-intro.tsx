import Image from "next/image";
import type { ComponentType, SVGProps } from "react";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { GlobeAltIcon } from "@/components/ui/icons/globe-alt";
import { SwitchHorizontalIcon } from "@/components/ui/icons/switch-horizontal";
import { RingedButton } from "@/components/ui/ringed-button";
import { USD_BENEFITS } from "@/lib/usd-account";

const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  spend: GlobeAltIcon,
  details: CircleUserIcon,
  convert: SwitchHorizontalIcon,
};

/** What a USD account gives you, and the way in. */
export function UsdIntro({ onStart }: { onStart: () => void }) {
  return (
    <>
      <Image
        src="/images/usd/coin-intro.webp"
        alt=""
        width={280}
        height={300}
        priority
        className="mt-3.25 h-37.5 w-35 self-center object-contain"
      />

      <h1 className="mt-8.75 text-center text-[32px] leading-8.5 font-semibold text-jumpa-black">
        Your USD account, <br /> made simple
      </h1>
      <p className="mt-2 text-center text-sm leading-4 text-jumpa-black">
        Get a US dollar account in minutes and enjoy a <br /> simple way to
        hold, receive, and manage USD.
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {USD_BENEFITS.map((benefit, index) => {
          const Icon = ICONS[benefit.id];
          return (
            <li key={benefit.id} className="flex flex-col gap-4 w-full">
              <div className="flex gap-2">
                <Icon
                  aria-hidden="true"
                  className="size-6 shrink-0 text-jumpa-primary-600"
                />
                {/* The design caps this column at 264; letting it fill keeps the
                    wrap sane across the whole column width. */}
                <span className="flex flex-1 flex-col gap-2">
                  <span className="text-sm leading-4 font-semibold text-jumpa-black">
                    {benefit.title}
                  </span>
                  <span className="text-sm leading-4 font-medium text-jumpa-neutral-425">
                    {benefit.description}
                  </span>
                </span>
              </div>
              {/* -mb-px: the design draws a zero-height line. */}
              {index < USD_BENEFITS.length - 1 ? (
                <span className="-mb-px block h-px w-full bg-jumpa-neutral-100" />
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex justify-center pt-10">
        <RingedButton onClick={onStart}>Create USD Account</RingedButton>
      </div>
    </>
  );
}
