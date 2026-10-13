import Image from "next/image";
import { HowItWorksSteps } from "@/components/landing/how-it-works-steps";
import { revealStep } from "@/components/landing/reveal";
import { SectionBadge } from "@/components/landing/section-badge";
import { SLIDE_IMAGE } from "@/components/landing/slide-image";
import { SnapCarousel } from "@/components/landing/snap-carousel";
import { HOW_IT_WORKS } from "@/lib/landing";

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-65 md:mt-116.5 md:scroll-mt-95"
    >
      <div className="relative mx-auto h-1033 w-402 md:h-1232 md:w-1440">
        <SectionBadge className="reveal absolute top-56 left-20 md:top-64 md:left-106.5">
          {HOW_IT_WORKS.badge}
        </SectionBadge>
        <h2
          style={revealStep(1)}
          className="reveal absolute inset-x-20 top-100 font-semibold text-jumpa-black text-u-32/32.5 -tracking-u-1.75 md:top-148.5 md:right-auto md:left-107 md:w-448 md:text-u-60/61 md:-tracking-u-3.25"
        >
          {HOW_IT_WORKS.heading}
        </h2>
        <p
          style={revealStep(2)}
          className="reveal absolute inset-x-20 top-184 font-medium text-jumpa-black text-u-14/21.75 -tracking-u-0.5 md:top-210.5 md:right-auto md:left-1038 md:w-295 md:text-u-20/31"
        >
          {HOW_IT_WORKS.subhead}
        </p>

        <div className="hidden md:contents">
          <HowItWorksSteps />
        </div>

        <SnapCarousel
          label={HOW_IT_WORKS.badge}
          count={HOW_IT_WORKS.steps.length}
          className="absolute inset-x-0 top-248 md:hidden"
          trackClassName="scroll-px-20 gap-37 px-20"
        >
          {HOW_IT_WORKS.steps.map((step) => (
            <article
              key={step.title}
              className="w-362 shrink-0 snap-start text-jumpa-black"
            >
              <div className="h-124 pt-18">
                <h3 className="font-bold text-u-22/21.25 -tracking-u-1">
                  {step.title}
                </h3>
                {/* The frame sets this at 14px on the first slide and 16px on the rest; 14 throughout. */}
                <p className="mt-7.75 text-u-14/19.25 -tracking-u-0.25">
                  {step.body}
                </p>
              </div>
              <div className="relative mt-30 h-538.5 overflow-clip rounded-u-33.75 bg-jumpa-surface-alt">
                <span
                  aria-hidden="true"
                  className="absolute top-428 right-[-6.69%] left-[-3.59%] h-150 rounded-full bg-jumpa-primary-50 opacity-28 blur-u-29"
                />
                <Image
                  src={step.image.src}
                  width={step.image.width}
                  height={step.image.height}
                  sizes="(min-width: 768px) 1px, 63vw"
                  alt=""
                  {...SLIDE_IMAGE}
                  className="absolute top-29.5 left-59.25 h-479 w-228 object-cover"
                />
              </div>
            </article>
          ))}
        </SnapCarousel>
      </div>
    </section>
  );
}
