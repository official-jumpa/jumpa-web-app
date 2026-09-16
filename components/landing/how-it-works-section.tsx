import type { CSSProperties } from "react";
import { DotGlow } from "@/components/landing/dot-glow";
import { GlowOrb } from "@/components/landing/glow-orb";
import { revealStep } from "@/components/landing/reveal";
import { SectionBadge } from "@/components/landing/section-badge";
import { GlobeBoldIcon } from "@/components/ui/icons/globe-bold";
import { MicrophoneIcon } from "@/components/ui/icons/microphone";
import { HOW_IT_WORKS, WAVEFORM_BARS } from "@/lib/landing";

/** The bar the row grows out from. Distance from it is each bar's stagger index. */
const WAVEFORM_CENTRE = (WAVEFORM_BARS.length - 1) / 2;

/**
 * The bar chart behind the microphone. Heights come straight from the design.
 *
 * It arrives once rather than looping: the bars grow out of the centre line in
 * both directions, which is the shape of a voice note starting. `scaleY` is
 * about each bar's own centre, so a bar opens from the baseline the design
 * draws it on and the row's height never changes.
 */
function Waveform() {
  return (
    <div className="frame-1106.5 w-338 md:w-1106.5">
      <div className="flex h-142 items-center justify-between">
        {WAVEFORM_BARS.map((height, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative list
            key={index}
            style={
              {
                height: `calc(${height} * var(--spacing))`,
                "--i": Math.abs(index - WAVEFORM_CENTRE),
                "--step": "52ms",
              } as CSSProperties
            }
            className="reveal-bar w-29.5 rounded-full bg-[image:var(--gradient-jumpa-landing)]"
          />
        ))}
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative pt-37 md:pt-121">
      <div className="relative mx-auto w-393 md:w-1440">
        <DotGlow
          tone="purple"
          className="drift -left-184.25 -top-31 w-714.5 md:top-12 md:left-0 md:w-1440"
        />

        <div className="mx-auto flex w-310 flex-col items-center gap-15 text-center md:w-763 md:gap-30">
          <SectionBadge
            variant="outline"
            icon={<GlobeBoldIcon />}
            className="reveal text-u-10 md:text-u-14"
          >
            {HOW_IT_WORKS.badge}
          </SectionBadge>
          <div className="flex w-full flex-col gap-15 md:gap-30">
            <h2
              style={revealStep(1)}
              className="reveal text-u-40/40 font-medium tracking-jumpa text-jumpa-white md:text-u-88/80"
            >
              {HOW_IT_WORKS.heading}
            </h2>
            <p
              style={revealStep(2)}
              className="reveal mx-auto w-244 text-u-12/18 font-medium text-jumpa-white md:w-full md:text-u-24/28"
            >
              {HOW_IT_WORKS.subhead}
            </p>
          </div>
        </div>

        <div className="relative mx-auto flex h-223 w-338 items-center justify-center md:mt-57 md:h-349 md:w-1106.5">
          <Waveform />
          <GlowOrb
            variant="mic"
            className="reveal-zoom absolute top-1/2 left-1/2 w-139.75 -translate-x-1/2 -translate-y-1/2 md:w-299"
          >
            <MicrophoneIcon className="absolute inset-0 m-auto size-217.5 text-jumpa-alt-400" />
          </GlowOrb>
        </div>

        <div className="mx-auto flex w-151 flex-col gap-63 text-center md:mt-84 md:w-1223 md:flex-row md:items-start md:justify-center">
          {HOW_IT_WORKS.steps.map((step, index) => (
            <div
              key={step.title}
              style={revealStep(index)}
              className="reveal flex w-151 flex-col gap-8 md:w-253 md:first:w-275"
            >
              <h3 className="text-u-16/20 font-semibold tracking-jumpa md:text-u-24/47">
                {step.title}
              </h3>
              <p
                className={
                  index === 0
                    ? "text-u-12/16 md:mx-auto md:w-179 md:text-u-18/24"
                    : "text-u-12/16 md:text-u-18/24"
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
