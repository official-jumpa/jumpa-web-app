import Image from "next/image";
import type { CSSProperties } from "react";
import { LandingButton } from "@/components/landing/landing-button";
import { MARQUEE_IMAGE } from "@/components/landing/marquee";
import { revealStep } from "@/components/landing/reveal";
import { CLOSING, COUNTRIES, CTA } from "@/lib/landing";

const IMG = "/images/landing";

/** Enough sets to cover a 3840 screen with one to spare, so the loop never shows its end. */
const MARQUEE = { "--copies": 5, "--marquee-s": "30s" } as CSSProperties;

const PILL =
  "flex h-28 items-center rounded-u-15 bg-jumpa-white/10 p-10 font-medium text-u-8.25/12 -tracking-u-0.25";

function Bubble({ className }: { className: string }) {
  return (
    <p className={className}>
      {CLOSING.bubble.lead}
      <span className="text-jumpa-lavender-800">{CLOSING.bubble.account}</span>
      {CLOSING.bubble.tail}
    </p>
  );
}

function CountryMarquee() {
  return (
    <div className="absolute inset-x-0 top-619 overflow-clip md:top-651">
      <ul
        aria-label="Supported countries"
        style={MARQUEE}
        className="flex w-max animate-marquee-x"
      >
        {Array.from({ length: 5 }, (_, copy) =>
          COUNTRIES.map((country) => (
            <li
              key={`${copy}-${country.name}`}
              aria-hidden={copy > 0 || undefined}
              className="shrink-0 pr-10 md:pr-28"
            >
              <Image
                src={country.src}
                width={country.width}
                height={124}
                sizes="(min-width: 768px) 190px, 134px"
                alt={copy > 0 ? "" : country.name}
                className="h-44 w-auto md:h-62"
                {...MARQUEE_IMAGE}
              />
            </li>
          )),
        )}
      </ul>
    </div>
  );
}

export function CtaSection() {
  return (
    <section className="relative overflow-clip bg-[image:var(--gradient-jumpa-cta-band-mobile)] md:mt-47 md:bg-[image:var(--gradient-jumpa-cta-band)]">
      <span
        aria-hidden="true"
        className="absolute inset-0 hidden bg-[image:var(--gradient-jumpa-cta-band-fade)] mix-blend-multiply md:block"
      />
      <div className="relative mx-auto h-701 w-402 text-center md:h-750 md:w-1440 md:text-left">
        <h2 className="reveal absolute inset-x-20 top-56 font-extrabold text-jumpa-ink text-u-40/40.75 -tracking-u-2 md:top-199.5 md:right-auto md:left-89 md:w-728.75 md:-translate-y-1/2 md:text-u-94.5/96.5 md:-tracking-u-5">
          {CLOSING.heading.lead}
          <span className="text-jumpa-primary-600">
            {CLOSING.heading.accent}
          </span>
        </h2>
        <p
          style={revealStep(1)}
          className="reveal absolute inset-x-20 top-158 text-jumpa-ink-muted text-u-16/23.5 -tracking-u-0.5 md:top-354.5 md:right-auto md:left-91 md:w-631 md:-translate-y-1/2 md:text-u-18/26.25"
        >
          {CLOSING.subhead}
        </p>
        <LandingButton
          href={CTA.start.href}
          className="reveal absolute top-247 left-1/2 h-53.5 w-172.75 -translate-x-1/2 text-u-15.5/24.25 -tracking-u-0.5 md:top-422 md:left-86 md:h-54.75 md:w-177.25 md:translate-x-0 md:text-u-16/24.75"
          style={revealStep(2)}
        >
          {CTA.start.label}
        </LandingButton>

        <div className="reveal-zoom absolute top-320.5 left-22.75 h-239.5 w-359.25 overflow-clip md:hidden">
          <Image
            src={`${IMG}/cta-phone-mobile.webp`}
            width={718}
            height={479}
            sizes="(min-width: 768px) 1px, 90vw"
            alt=""
            className="absolute top-3.5 -left-0.75 h-239.5 w-359"
          />
          <div className="absolute top-72.5 left-200.25 h-30.5 w-135 rounded-u-15 bg-jumpa-primary-50">
            <Bubble className="absolute top-15.5 left-11.5 -translate-y-1/2 whitespace-nowrap font-medium text-jumpa-ink-muted text-u-8.25/12 -tracking-u-0.25" />
          </div>
        </div>
        <p
          className={`${PILL} reveal absolute top-328 left-20 text-jumpa-ink-muted md:hidden`}
        >
          {CLOSING.pills[0]}
        </p>

        <div className="reveal-zoom absolute top-149 left-563 hidden h-599.25 w-899 md:block">
          <Image
            src={`${IMG}/cta-phone.webp`}
            width={1798}
            height={1199}
            sizes="(min-width: 1440px) 899px, 62vw"
            alt=""
            className="size-full"
          />
        </div>
        <Image
          src={`${IMG}/cta-message-cedis.webp`}
          width={483}
          height={109}
          sizes="(min-width: 1440px) 242px, 17vw"
          alt=""
          style={revealStep(3)}
          className="reveal absolute top-477 left-629 hidden h-54.5 w-241.5 md:block"
        />
        <Image
          src={`${IMG}/cta-message-dollars.webp`}
          width={303}
          height={109}
          sizes="(min-width: 1440px) 152px, 11vw"
          alt=""
          style={revealStep(4)}
          className="reveal absolute top-396 left-1122 hidden h-54.5 w-151.5 md:block"
        />
        <div
          style={revealStep(2)}
          className="reveal absolute top-194 left-1046 hidden h-67 w-296 rounded-u-25 bg-jumpa-primary-50 md:block"
        >
          <Bubble className="absolute top-33.5 left-25 -translate-y-1/2 whitespace-nowrap font-medium text-jumpa-ink-muted text-u-18/26.25 -tracking-u-0.5" />
        </div>

        <Image
          src={`${IMG}/cta-glow-mobile.webp`}
          width={272}
          height={184}
          sizes="(min-width: 768px) 1px, 68vw"
          alt=""
          className="absolute top-497 left-129 h-184 w-272 blur-u-13.5 md:hidden"
        />
        <Image
          src={`${IMG}/cta-glow.webp`}
          width={823}
          height={219}
          sizes="(min-width: 1440px) 823px, 57vw"
          alt=""
          className="absolute top-564 left-638 hidden h-219 w-823 blur-u-30 md:block"
        />
        <p
          className={`${PILL} reveal absolute top-505 left-44 text-jumpa-white md:hidden`}
        >
          {CLOSING.pills[1]}
        </p>

        <p className="absolute inset-x-20 top-578 font-semibold text-jumpa-white/38 text-u-16/18.75 -tracking-u-1.25 md:top-602.5 md:right-auto md:left-93 md:-translate-y-1/2 md:whitespace-nowrap md:text-u-26.75/31.25 md:-tracking-u-1.5">
          {CLOSING.borders}
        </p>
      </div>
      <CountryMarquee />
    </section>
  );
}
