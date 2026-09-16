import { DotGlow } from "@/components/landing/dot-glow";
import { GlowOrb } from "@/components/landing/glow-orb";
import { ReviewMockup } from "@/components/landing/review-mockup";
import { SectionBadge } from "@/components/landing/section-badge";
import { FlashIcon } from "@/components/ui/icons/flash";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { cn } from "@/lib/cn";
import { SECURITY } from "@/lib/landing";

/**
 * Security: three white panels over a purple dot glow, each clipping a glossy
 * illustration that runs off its bottom edge. The panels carry the design's
 * padding minus their own stroke, so the copy lands on the same inset a Figma
 * inside stroke gives it.
 */
const CARD =
  "relative isolate flex flex-col overflow-clip rounded-u-22 border-u-1 border-jumpa-primary-50/50 bg-jumpa-white p-14.75 backdrop-blur-u-21 md:rounded-u-42 md:border-u-2 md:p-28 md:backdrop-blur-u-40";
const COPY = "flex flex-col gap-10.5 p-5.25 md:gap-20 md:p-10";
const TITLE = "font-semibold tracking-jumpa whitespace-nowrap";
const BODY = "tracking-jumpa";

export function SecuritySection() {
  const { access, pin, review } = SECURITY.cards;
  return (
    <section id="security" className="relative pt-32 md:pt-47">
      <div className="relative mx-auto w-393 md:w-1440">
        <DotGlow
          tone="purple"
          className="-left-190 top-531 w-714.5 md:top-759 md:-left-49 md:w-1537.75"
        />

        <div className="mx-auto flex w-320 flex-col items-center gap-15 text-center md:w-713 md:gap-24">
          <SectionBadge
            variant="discWhite"
            icon={<FlashIcon />}
            className="text-u-12.25 md:text-u-16"
          >
            {SECURITY.badge}
          </SectionBadge>
          <h2 className="bg-[image:var(--gradient-jumpa-landing)] bg-clip-text text-u-40/40 font-medium tracking-jumpa text-transparent md:text-u-72/70">
            {SECURITY.heading}
          </h2>
          <p className="text-u-12/18 tracking-jumpa md:w-607 md:text-u-20/28">
            {SECURITY.subhead}
          </p>
        </div>

        <div className="mx-auto mt-48 flex w-324 flex-col gap-15 md:mt-96 md:w-1240 md:flex-row md:gap-20">
          <div className="flex flex-col gap-15 md:w-610 md:gap-20">
            <div className={cn(CARD, "h-231.25 md:h-441")}>
              <div className={cn(COPY, "flex-1")}>
                <h3 className={cn(TITLE, "text-u-12/11.5 md:text-u-24/22")}>
                  <span className="md:hidden">{access.mobileTitle}</span>
                  <span className="hidden md:inline">{access.title}</span>
                </h3>
                <p className={cn(BODY, "text-u-10/11.5 md:text-u-20/22")}>
                  <span className="md:hidden">{access.mobileDescription}</span>
                  <span className="hidden md:inline">{access.description}</span>
                </p>
              </div>
              <GlowOrb
                variant="sphere"
                className="absolute top-84.5 left-53 w-218.75 md:top-172 md:left-97 md:w-417"
              >
                <ShieldCheckIcon className="absolute inset-0 m-auto size-251.75 text-jumpa-alt-300" />
              </GlowOrb>
            </div>

            <div className={cn(CARD, "h-231.25 md:h-441")}>
              <div className={cn(COPY, "flex-1")}>
                <h3 className={cn(TITLE, "text-u-12/11.5 md:text-u-24/22")}>
                  {pin.title}
                </h3>
                <p
                  className={cn(
                    BODY,
                    "w-196.75 text-u-10/11.5 md:w-512 md:text-u-20/22",
                  )}
                >
                  {pin.description}
                </p>
              </div>
              <GlowOrb
                variant="pin"
                className="absolute top-110.25 left-28.75 w-266.5 md:top-190 md:left-51 md:w-508.25"
              />
            </div>
          </div>

          <div className={cn(CARD, "h-385 md:h-902 md:w-610")}>
            {/* The copy is taller than its own box, so `justify-end` pushes it
                up past the top padding — which is what the design draws. */}
            <div className={cn(COPY, "h-62 shrink-0 justify-end md:h-118")}>
              <h3 className={cn(TITLE, "text-u-12/11.5 md:text-u-24/22")}>
                {review.title}
              </h3>
              <p
                className={cn(
                  BODY,
                  "w-196.75 text-u-10/11.5 md:w-375 md:text-u-18/22",
                )}
              >
                {review.description.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            </div>
            <GlowOrb
              variant="review"
              className="absolute top-112.75 -left-46.5 w-416.5 md:top-299 md:-left-92.5 md:w-794"
            />
            <ReviewMockup className="absolute top-90 left-65 w-182 md:top-203 md:left-92 md:w-422.5" />
          </div>
        </div>
      </div>
    </section>
  );
}
