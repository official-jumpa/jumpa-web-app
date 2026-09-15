import { DotGlow } from "@/components/landing/dot-glow";
import { GlowOrb } from "@/components/landing/glow-orb";
import { SectionBadge } from "@/components/landing/section-badge";
import { GlobeBoldIcon } from "@/components/ui/icons/globe-bold";
import { MicrophoneIcon } from "@/components/ui/icons/microphone";
import { HOW_IT_WORKS, WAVEFORM_BARS } from "@/lib/landing";

/** The static bar chart behind the microphone. Heights come straight from the design. */
function Waveform() {
  return (
    <div className="frame-1106.5 w-338 lg:w-1106.5">
      <div className="flex h-142 items-center justify-between">
        {WAVEFORM_BARS.map((height, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative list
            key={index}
            style={{ height: `calc(${height} * var(--spacing))` }}
            className="w-29.5 rounded-full bg-[image:var(--gradient-jumpa-landing)]"
          />
        ))}
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative pt-37 lg:pt-121">
      <div className="relative mx-auto w-393 lg:w-1440">
        <DotGlow
          tone="purple"
          className="-left-184.25 -top-31 w-714.5 lg:top-12 lg:left-0 lg:w-1440"
        />

        <div className="mx-auto flex w-310 flex-col items-center gap-15 text-center lg:w-763 lg:gap-30">
          <SectionBadge
            variant="outline"
            icon={<GlobeBoldIcon />}
            className="text-u-10 lg:text-u-14"
          >
            {HOW_IT_WORKS.badge}
          </SectionBadge>
          <div className="flex w-full flex-col gap-15 lg:gap-30">
            <h2 className="text-u-40/40 font-medium tracking-jumpa text-jumpa-white lg:text-u-88/80">
              {HOW_IT_WORKS.heading}
            </h2>
            <p className="mx-auto w-244 text-u-12/18 font-medium text-jumpa-white lg:w-full lg:text-u-24/28">
              {HOW_IT_WORKS.subhead}
            </p>
          </div>
        </div>

        <div className="relative mx-auto flex h-223 w-338 items-center justify-center lg:mt-57 lg:h-349 lg:w-1106.5">
          <Waveform />
          <GlowOrb
            variant="mic"
            className="absolute top-1/2 left-1/2 w-139.75 -translate-x-1/2 -translate-y-1/2 lg:w-299"
          >
            <MicrophoneIcon className="absolute inset-0 m-auto size-217.5 text-jumpa-alt-400" />
          </GlowOrb>
        </div>

        <div className="mx-auto flex w-151 flex-col gap-63 text-center lg:mt-84 lg:w-1223 lg:flex-row lg:items-start lg:justify-center">
          {HOW_IT_WORKS.steps.map((step, index) => (
            <div
              key={step.title}
              className="flex w-151 flex-col gap-8 lg:w-253 lg:first:w-275"
            >
              <h3 className="text-u-16/20 font-semibold tracking-jumpa lg:text-u-24/47">
                {step.title}
              </h3>
              <p
                className={
                  index === 0
                    ? "text-u-12/16 lg:mx-auto lg:w-179 lg:text-u-18/24"
                    : "text-u-12/16 lg:text-u-18/24"
                }
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
