import { CtaPill } from "@/components/landing/cta-pill";
import {
  ReceiveCard,
  SaveCard,
  SendCard,
  SwapCard,
} from "@/components/landing/feature-cards";
import { SectionBadge } from "@/components/landing/section-badge";
import { FlashIcon } from "@/components/ui/icons/flash";
import { CTA_LABEL, FEATURES } from "@/lib/landing";

/**
 * Features: a copy panel beside a row of four artwork cards. The design clips
 * the row after the first card and a half at both breakpoints; it is a
 * scroller here so the other three are reachable — flagged to the client.
 */
export function FeaturesSection() {
  return (
    <section id="features" className="pt-34 lg:pt-128">
      <div className="mx-auto flex w-350 flex-col gap-10 lg:w-1300 lg:flex-row">
        <div className="flex h-267.5 shrink-0 flex-col justify-center gap-15 rounded-u-30 bg-jumpa-primary-25 p-20 lg:h-615 lg:w-548 lg:gap-50 lg:px-50">
          <div className="flex flex-col items-start gap-15 lg:gap-24">
            <SectionBadge
              variant="disc"
              icon={<FlashIcon />}
              className="text-u-12 lg:text-u-16"
            >
              {FEATURES.badge}
            </SectionBadge>
            <h2 className="bg-[image:var(--gradient-jumpa-landing)] bg-clip-text text-u-40/40 font-medium tracking-jumpa text-transparent lg:text-u-72/70">
              {FEATURES.heading}
            </h2>
            <p className="text-u-12/18 tracking-jumpa lg:text-u-24/32 lg:font-medium">
              {FEATURES.subhead}
            </p>
          </div>
          <CtaPill href="#join" className="pill-u-10.25 lg:pill-u-23.5">
            {CTA_LABEL}
          </CtaPill>
        </div>

        <div className="flex gap-17.5 overflow-x-auto rounded-u-30 bg-jumpa-primary-25 p-20 lg:gap-40 lg:px-50 lg:py-54 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SendCard />
          <ReceiveCard />
          <SwapCard />
          <SaveCard />
        </div>
      </div>
    </section>
  );
}
