import { preload } from "react-dom";
import { Art } from "@/components/landing/art";
import { countChars, HeadlineChars } from "@/components/landing/headline-chars";
import { LandingButton } from "@/components/landing/landing-button";
import { revealStep } from "@/components/landing/reveal";
import { CTA, HERO } from "@/lib/landing";

/** Where the heading's own characters stop, so the gradient word follows in step. */
const LEAD_CHARS = countChars(HERO.heading.lead);

/* The column runs on the 70ms `.stagger` step while the heading types itself on
   a 34ms one: the subhead lands as the last character does, the rest behind it. */
const SUBHEAD_STEP = 13;

const GRID = "/images/landing/hero-grid.webp";

/** Glows sit under the grid, as the design layers them, and drift on their own clocks. */
const GLOW = "absolute rounded-full opacity-18 will-change-transform md:w-auto";

export function HeroSection() {
  // A CSS background is only found once styles apply; fetch it with the HTML.
  preload(GRID, { as: "image" });
  return (
    <section className="relative isolate -mt-65 overflow-clip md:-mt-95">
      <div aria-hidden="true" className="absolute inset-0">
        <div className="relative mx-auto h-full w-402 md:w-1440">
          <span
            className={`${GLOW} top-356 -left-34 h-90 w-97 animate-glow-a bg-jumpa-primary-600 blur-u-17 md:top-481.5 md:right-[82.5%] md:left-[1.59%] md:h-229.5 md:blur-u-36.75`}
          />
          <span
            className={`${GLOW} top-314 left-310.25 h-119 w-122.5 animate-glow-b bg-jumpa-alt-400 blur-u-19.75 md:top-383 md:right-[4.05%] md:left-[78.1%] md:h-257.5 md:blur-u-42.5`}
          />
        </div>
      </div>

      {/* Tiles at a fixed size past 1440 so the grid never stretches. */}
      <span
        aria-hidden="true"
        style={{ backgroundImage: `url(${GRID})` }}
        className="absolute inset-0 bg-cover bg-center md:bg-[length:calc(1440*var(--spacing))_calc(765.5*var(--spacing))] md:bg-[position:calc(50%+3*var(--spacing))_0] md:bg-repeat-x"
      />

      <div className="relative mx-auto h-494 w-402 md:h-765.5 md:w-1440">
        {/* Plays at the first paint from `animate-*` utilities: the hero is
            always above the fold, so it cannot wait for hydration. */}
        <div className="absolute inset-x-20 top-111 flex flex-col items-center gap-20.75 text-center md:top-127 md:right-auto md:left-267 md:w-895 md:gap-26">
          <p className="relative flex animate-drop-in items-center gap-6 rounded-full border-u-1 bg-jumpa-white px-12 py-6 font-medium font-sans text-jumpa-black text-u-12/13.75 border-jumpa-lavender-250 md:h-38 md:w-255 md:justify-center md:border-jumpa-lavender-200 md:p-0 md:text-u-14/16">
            <Art
              src="/images/landing/badge-dot.svg"
              className="size-6 shrink-0 md:absolute md:top-1/2 md:left-16 md:size-8 md:-translate-y-1/2"
            />
            <span className="whitespace-nowrap md:relative md:left-9">
              {HERO.badge.lead}
              <strong className="font-bold">{HERO.badge.strong}</strong>
              {HERO.badge.tail}
            </span>
          </p>

          <h1 className="w-full font-extrabold text-jumpa-black text-u-44/44.75 -tracking-u-0.75 md:text-u-112/113.75 md:-tracking-u-6.75">
            {/* The split is decorative; this is the sentence a screen reader gets. */}
            <span className="sr-only">
              {HERO.heading.lead}
              {HERO.heading.accent}
            </span>
            <span aria-hidden="true">
              <HeadlineChars text={HERO.heading.lead} />
              {/* One unit: a per-character opacity stops `bg-clip-text` painting. */}
              <span
                style={revealStep(LEAD_CHARS)}
                className="headline-accent inline-block"
              >
                {HERO.heading.accent}
              </span>
            </span>
          </h1>

          <p
            style={revealStep(SUBHEAD_STEP)}
            className="stagger animate-reveal text-jumpa-ink-muted text-u-14/21.75 -tracking-u-0.5 md:w-751 md:py-12 md:text-u-20/31"
          >
            {HERO.subhead}
          </p>

          <div
            style={revealStep(SUBHEAD_STEP + 2)}
            className="stagger animate-reveal"
          >
            <LandingButton
              href={CTA.start.href}
              className="h-53.5 w-172.75 text-u-15.5/24.25 -tracking-u-0.5 md:h-54.75 md:w-177.25 md:text-u-16/24.75"
            >
              {CTA.start.label}
            </LandingButton>
          </div>

          <p
            style={revealStep(SUBHEAD_STEP + 4)}
            className="stagger flex animate-reveal items-center gap-3.5 md:relative md:left-4 md:mt-38.5 md:gap-5"
          >
            <span className="whitespace-nowrap font-medium text-jumpa-black text-u-11.25/16.5 -tracking-u-0.5 md:text-u-16/23.25 md:-tracking-u-0.75">
              {HERO.backedBy}
            </span>
            <Art
              src="/images/landing/stellar.svg"
              className="-mt-0.75 h-18 w-72 md:mt-0 md:h-25.5 md:w-102"
            />
            <span className="sr-only">Stellar</span>
          </p>
        </div>
      </div>
    </section>
  );
}
