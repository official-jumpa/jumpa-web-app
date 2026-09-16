import Image from "next/image";
import { CtaPill } from "@/components/landing/cta-pill";
import { DotGlow } from "@/components/landing/dot-glow";
import { QuickActionChips } from "@/components/landing/quick-action-chips";
import { revealStep } from "@/components/landing/reveal";
import { ReviewMockup } from "@/components/landing/review-mockup";
import { SectionBadge } from "@/components/landing/section-badge";
import { FlashIcon } from "@/components/ui/icons/flash";
import { CTA_LABEL, WHY_JUMPA } from "@/lib/landing";

/**
 * Why Jumpa: a full-bleed purple band with the product panel in the middle.
 * `isolate` is deliberate — the dot glow and the lime wash below it both paint
 * at `-z-10` over this section's own gradient, and the wash blends here.
 */
export function WhyJumpaSection() {
  return (
    <section className="relative isolate mt-74 flex flex-col items-center gap-50 overflow-hidden bg-[image:var(--gradient-jumpa-landing)] pt-50 pb-84 md:mt-120 md:gap-100 md:pt-100 md:pb-148">
      <DotGlow
        tone="purple"
        className="drift -left-55.5 top-1043.5 w-655.5 md:top-1206 md:left-21 md:w-1398.25 [--drift:60]"
      />
      <img
        src="/images/landing/why-glow-lime.svg"
        alt=""
        aria-hidden="true"
        className="drift pointer-events-none absolute -z-10 -left-121.25 top-989 h-265.5 w-635.5 max-w-none mix-blend-plus-lighter md:-left-491 md:top-973 md:h-1011 md:w-2421.25 [--drift:-70]"
      />

      <div className="flex w-320 flex-col items-center gap-20 text-center md:w-781">
        <SectionBadge
          variant="disc"
          icon={<FlashIcon />}
          className="reveal text-u-10.5 md:text-u-16"
        >
          {WHY_JUMPA.badge}
        </SectionBadge>
        <h2
          style={revealStep(1)}
          className="reveal text-u-40/40 font-medium tracking-jumpa text-jumpa-white md:text-u-72/75"
        >
          {WHY_JUMPA.heading}
        </h2>
        <p
          style={revealStep(2)}
          className="reveal text-u-12/18 tracking-jumpa text-jumpa-neutral-50 md:text-u-20/22 md:font-medium"
        >
          {WHY_JUMPA.subhead}
        </p>
      </div>

      <div className="flex w-320 flex-col gap-130 rounded-u-30 bg-jumpa-primary-300 p-20 shadow-ue-50/5 md:w-1207 md:flex-row md:items-end md:justify-center md:gap-100 md:px-100 md:pt-100 md:pb-50">
        {/* The panel arrives as two halves closing on each other, rather than
            row by row — its left column is one argument and its right is the
            product shot that answers it. */}
        <div className="reveal-left flex flex-col gap-20 text-jumpa-neutral-50 md:h-full md:flex-1 md:justify-center md:gap-50 md:py-20">
          <div className="flex flex-col gap-20">
            <h3 className="text-u-32/30 font-medium tracking-jumpa md:text-u-48/43.25">
              {WHY_JUMPA.panel.heading}
            </h3>
            <p className="text-u-12/18 tracking-jumpa md:text-u-24/32 md:font-medium">
              {WHY_JUMPA.panel.subhead}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="h-1 w-full dashed-rule-8 text-jumpa-neutral-100"
          />
          <CtaPill href="#join" className="pill-u-10.25 md:pill-u-23.5">
            {CTA_LABEL}
          </CtaPill>
          <QuickActionChips variant="why" />
        </div>

        <div
          style={revealStep(1)}
          className="reveal-right relative h-233 w-full shrink-0 rounded-u-11.25 bg-jumpa-neutral-50 md:h-421 md:w-528 md:rounded-u-22"
        >
          <ReviewMockup className="absolute -top-105 left-1/2 w-219.25 -translate-x-1/2 md:hidden" />
          <Image
            src="/images/landing/why-phone-mockup.webp"
            alt=""
            width={916}
            height={1282}
            sizes="458px"
            className="absolute -top-220 left-1/2 hidden h-641 w-458 max-w-none -translate-x-1/2 object-contain md:block"
          />
        </div>
      </div>
    </section>
  );
}
