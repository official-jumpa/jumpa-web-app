import Image from "next/image";
import type { ComponentType, SVGProps } from "react";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { SwitchHorizontalIcon } from "@/components/ui/icons/switch-horizontal";
import { RingedButton } from "@/components/ui/ringed-button";
import { KYC_BENEFITS } from "@/lib/kyc";

const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  quick: GlobeIcon,
  secure: CircleUserIcon,
  protected: SwitchHorizontalIcon,
};

/** What verification unlocks, and the way in. */
export function KycIntro({ onStart }: { onStart: () => void }) {
  return (
    <>
      <Image
        src="/images/kyc/verified.webp"
        alt=""
        width={400}
        height={400}
        priority
        className="mt-8 size-34.25 self-center"
      />

      <h1 className="mt-6 text-center text-[32px] leading-9.5 font-bold text-jumpa-black">
        Verify your identity
      </h1>
      <p className="mt-2 text-center text-sm leading-5 text-jumpa-black">
        A quick verification helps us keep your account secure and meet
        regulatory requirements.
      </p>

      <ul className="mt-11 flex flex-col gap-4">
        {KYC_BENEFITS.map((benefit, index) => {
          const Icon = ICONS[benefit.id];
          return (
            <li key={benefit.id} className="flex flex-col gap-4">
              <div className="flex gap-3">
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-6 shrink-0 text-jumpa-primary-600"
                />
                <span className="flex flex-col gap-1">
                  <span className="text-sm leading-4.5 font-semibold text-jumpa-black">
                    {benefit.title}
                  </span>
                  <span className="text-xs leading-4.5 text-jumpa-neutral-400">
                    {benefit.description}
                  </span>
                </span>
              </div>
              {/* -mb-px: the design draws a zero-height line. */}
              {index < KYC_BENEFITS.length - 1 ? (
                <span className="-mb-px block h-px w-full bg-jumpa-neutral-100" />
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex justify-center pt-10">
        <RingedButton onClick={onStart}>Continue to verification</RingedButton>
      </div>
    </>
  );
}
