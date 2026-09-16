import Image from "next/image";
import { BetaEmailCard } from "@/components/landing/email-capture-form";
import { revealStep } from "@/components/landing/reveal";
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
    <section id="join" className="relative z-10 pt-72 md:pt-180">
      <div className="mx-auto w-393 md:w-1440">
        <div className="relative isolate mx-auto flex flex-col gap-100 overflow-clip px-20 pt-20 pb-30 md:h-700 md:w-1300 md:flex-row md:items-end md:justify-center md:rounded-u-40 md:p-60">
          <Image
            src="/images/landing/beta-cta-photo-mobile.webp"
            alt=""
            fill
            sizes="100vw"
            className="-z-10 object-cover md:hidden"
          />
          <Image
            src="/images/landing/beta-cta-photo.webp"
            alt=""
            fill
            sizes="(min-width: 768px) 1300px, 1px"
            className="-z-10 hidden object-cover md:block"
          />
          {/* The phone frame darkens the lower half of the photo; desktop does not. */}
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[image:var(--gradient-jumpa-photo-shade)] md:hidden"
          />
          <img
            src="/images/landing/cta-tint.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -top-180 -left-236 -z-10 h-737 w-801 max-w-none mix-blend-color md:-top-110"
          />

          <div className="flex flex-col gap-15 py-10 md:h-full md:w-539 md:justify-between md:gap-0 md:py-30">
            <SectionBadge
              variant="outline"
              icon={<GlobeBoldIcon />}
              className="reveal self-start text-u-15.5 md:text-u-14"
            >
              {BETA_CTA.badge}
            </SectionBadge>
            <h2
              style={revealStep(1)}
              className="reveal text-u-40/40 font-medium tracking-jumpa text-jumpa-white md:text-u-86/65"
            >
              <span className="md:hidden">{BETA_CTA.mobile.heading}</span>
              <span className="hidden md:inline">
                {BETA_CTA.desktop.heading}
              </span>
            </h2>
            <p
              style={revealStep(2)}
              className="reveal text-u-12/18 tracking-jumpa text-jumpa-white md:text-u-20/24 md:font-medium"
            >
              <span className="md:hidden">{BETA_CTA.mobile.blurb}</span>
              <span className="hidden md:inline">{BETA_CTA.desktop.blurb}</span>
            </p>
          </div>

          {/* The form arrives from the right, meeting the copy. Safe here where
              it is not in the other sections: this card is `overflow-clip`, so
              the travel is cut off rather than widening the page. */}
          <div
            style={revealStep(1)}
            className="reveal-right flex flex-col gap-25 md:w-541"
          >
            <h3 className="text-u-16/20 font-semibold tracking-jumpa text-jumpa-white md:text-u-40/22">
              {BETA_CTA.formTitle}
            </h3>
            <BetaEmailCard />
            <p className="text-u-12/18 tracking-jumpa text-jumpa-white md:text-u-20/22 md:font-medium">
              {BETA_CTA.note}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
