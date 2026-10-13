import { Art } from "@/components/landing/art";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { LandingButton } from "@/components/landing/landing-button";
import { revealStep } from "@/components/landing/reveal";
import { SectionBadge } from "@/components/landing/section-badge";
import { FAQ } from "@/lib/landing";

const SUPPORT_ICON = "/images/landing/support.svg";

/** Phones stack everything in flow; from `md:` the left column is pinned and the list flows. */
export function FaqSection() {
  return (
    <section
      id="faq"
      className="scroll-mt-65 overflow-clip bg-jumpa-surface md:scroll-mt-95"
    >
      <div className="relative mx-auto flex w-402 flex-col items-start gap-20 px-20 py-56 md:block md:min-h-1133 md:w-1440 md:px-0 md:py-108">
        <div className="absolute top-485 -left-329 hidden h-832.5 w-830 items-center justify-center md:flex">
          <Art
            src="/images/landing/faq-decor.svg"
            className="drift h-487.25 w-688.25 flex-none rotate-[45.51deg]"
          />
        </div>

        <SectionBadge className="reveal md:absolute md:top-108 md:left-104">
          {FAQ.badge}
        </SectionBadge>
        <h2
          style={revealStep(1)}
          className="reveal font-medium text-jumpa-ink text-u-32/34.75 -tracking-u-1.25 md:absolute md:top-255 md:left-104 md:w-479 md:-translate-y-1/2 md:text-u-60/65.25 md:-tracking-u-2.25"
        >
          {FAQ.heading}
        </h2>
        <p
          style={revealStep(2)}
          className="reveal font-medium text-jumpa-black text-u-16/24.75 -tracking-u-0.5 md:absolute md:top-385.5 md:left-104 md:w-400 md:-translate-y-1/2 md:text-u-20/31"
        >
          {FAQ.subhead}
        </p>

        <div className="hidden md:contents">
          <Art
            src={SUPPORT_ICON}
            className="reveal absolute top-473 left-106 size-31"
          />
          <p
            style={revealStep(1)}
            className="reveal absolute top-489.5 left-144 -translate-y-1/2 whitespace-nowrap font-medium text-jumpa-black text-u-20/31 -tracking-u-0.5"
          >
            {FAQ.support.label}
          </p>
          <LandingButton
            href={FAQ.support.href}
            tone="violet"
            className="reveal absolute top-540 left-107 h-54.75 w-177.25 text-u-16/24.75 -tracking-u-0.5"
          >
            {FAQ.support.cta}
          </LandingButton>
        </div>

        <FaqAccordion
          items={FAQ.items}
          className="reveal w-full md:ml-736 md:w-598"
        />

        <div className="reveal relative h-105 w-full rounded-u-24 bg-jumpa-surface-faq md:hidden">
          <div className="absolute top-35 left-26 flex items-center gap-16">
            <Art src={SUPPORT_ICON} className="size-31 shrink-0" />
            <p className="w-142 font-medium text-jumpa-black text-u-14/21.75 -tracking-u-0.5">
              {FAQ.support.label}
            </p>
            <LandingButton
              href={FAQ.support.href}
              className="px-21.5 py-10.75 text-u-12.25/19.25 -tracking-u-0.25"
            >
              {FAQ.support.cta}
            </LandingButton>
          </div>
        </div>
      </div>
    </section>
  );
}
