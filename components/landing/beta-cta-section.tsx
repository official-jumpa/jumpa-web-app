import Image from "next/image";
import { BetaEmailCard } from "@/components/landing/email-capture-form";
import { SectionBadge } from "@/components/landing/section-badge";
import { GlobeBoldIcon } from "@/components/ui/icons/globe-bold";
import { BETA_CTA } from "@/lib/landing";

/**
 * Beta CTA. The phone frame is not a scaled desktop — it carries its own
 * heading and blurb, a much tighter crop of the same photo and a dark wash over
 * it, so each breakpoint ships its own export and its own copy. `z-10` keeps the
 * card over the footer, whose band starts 92px before this section ends.
 */
export function BetaCtaSection() {
  return (
    <section id="join" className="relative z-10 pt-72 lg:pt-180">
      <div className="mx-auto w-393 lg:w-1440">
        <div className="relative isolate mx-auto flex flex-col gap-100 overflow-clip px-20 pt-20 pb-30 lg:h-700 lg:w-1300 lg:flex-row lg:items-end lg:justify-center lg:rounded-u-40 lg:p-60">
          <Image
            src="/images/landing/beta-cta-photo-mobile.webp"
            alt=""
            fill
            sizes="100vw"
            className="-z-10 object-cover lg:hidden"
          />
          <Image
            src="/images/landing/beta-cta-photo.webp"
            alt=""
            fill
            sizes="(min-width: 1024px) 1300px, 1px"
            className="-z-10 hidden object-cover lg:block"
          />
          {/* The phone frame darkens the lower half of the photo; desktop does not. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[image:var(--gradient-jumpa-photo-shade)] lg:hidden"
          />
          <img
            src="/images/landing/cta-tint.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -top-180 -left-236 -z-10 h-737 w-801 max-w-none mix-blend-color lg:-top-110"
          />

          <div className="flex flex-col gap-15 py-10 lg:h-full lg:w-539 lg:justify-between lg:gap-0 lg:py-30">
            <SectionBadge
              variant="outline"
              icon={<GlobeBoldIcon />}
              className="self-start text-u-15.5 lg:text-u-14"
            >
              {BETA_CTA.badge}
            </SectionBadge>
            <h2 className="text-u-40/40 font-medium tracking-jumpa text-jumpa-white lg:text-u-86/65">
              <span className="lg:hidden">{BETA_CTA.mobile.heading}</span>
              <span className="hidden lg:inline">
                {BETA_CTA.desktop.heading}
              </span>
            </h2>
            <p className="text-u-12/18 tracking-jumpa text-jumpa-white lg:text-u-20/24 lg:font-medium">
              <span className="lg:hidden">{BETA_CTA.mobile.blurb}</span>
              <span className="hidden lg:inline">{BETA_CTA.desktop.blurb}</span>
            </p>
          </div>

          <div className="flex flex-col gap-25 lg:w-541">
            <h3 className="text-u-16/20 font-semibold tracking-jumpa text-jumpa-white lg:text-u-40/22">
              {BETA_CTA.formTitle}
            </h3>
            <BetaEmailCard />
            <p className="text-u-12/18 tracking-jumpa text-jumpa-white lg:text-u-20/22 lg:font-medium">
              {BETA_CTA.note}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
