import type { CSSProperties } from "react";
import { Art } from "@/components/landing/art";
import { revealStep } from "@/components/landing/reveal";
import { SectionBadge } from "@/components/landing/section-badge";
import {
  TestimonialCard,
  TestimonialCardMobile,
} from "@/components/landing/testimonial-card";
import { TestimonialCarousel } from "@/components/landing/testimonial-carousel";
import { TESTIMONIALS } from "@/lib/landing";

const MARQUEE = { "--copies": 2, "--marquee-s": "48s" } as CSSProperties;

/** The white wash that fades cards in and out at the marquee's edges. */
const FADE =
  "absolute left-20 h-79 w-362 rounded-t-u-24 bg-jumpa-white blur-u-10 md:hidden";

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="-mt-36 scroll-mt-65 md:mt-0 md:scroll-mt-95"
    >
      <div className="relative mx-auto h-923 w-402 md:h-889 md:w-1440">
        <Art
          src="/images/landing/testimonial-glow.svg"
          className="drift absolute top-198 left-647 hidden h-574.5 w-654 md:block"
        />
        <SectionBadge className="reveal absolute top-56 left-20 md:top-39 md:left-106.5">
          {TESTIMONIALS.badge}
        </SectionBadge>
        <h2
          style={revealStep(1)}
          className="reveal absolute inset-x-20 top-100 font-semibold text-jumpa-ink text-u-32/37.25 -tracking-u-1.75 md:top-152 md:right-auto md:left-104 md:w-547 md:text-u-60/70 md:-tracking-u-3.25"
        >
          {TESTIMONIALS.heading}
        </h2>
        <p
          style={revealStep(2)}
          className="reveal absolute inset-x-20 top-157 font-medium text-jumpa-black text-u-16/24.75 -tracking-u-0.5 md:top-254.5 md:right-auto md:left-107 md:w-358 md:text-u-20/31"
        >
          {TESTIMONIALS.subhead}
        </p>

        <TestimonialCarousel
          label={TESTIMONIALS.heading}
          className="reveal absolute top-44 left-541 hidden h-832 w-823 md:block"
        >
          {TESTIMONIALS.items.map((item) => (
            <TestimonialCard key={item.name} item={item} />
          ))}
        </TestimonialCarousel>

        <div className="absolute top-252 left-20 h-615 w-362 overflow-clip md:hidden">
          <div
            style={MARQUEE}
            className="mt-2 flex animate-marquee-y flex-col hover:[animation-play-state:paused]"
          >
            {[0, 1].map((copy) => (
              <div
                key={copy}
                aria-hidden={copy === 1 || undefined}
                className="flex flex-col gap-20 pb-20"
              >
                {TESTIMONIALS.items.map((item) => (
                  <TestimonialCardMobile key={item.name} item={item} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <span aria-hidden="true" className={`${FADE} top-226`} />
        <span aria-hidden="true" className={`${FADE} top-831 -scale-y-100`} />
      </div>
    </section>
  );
}
