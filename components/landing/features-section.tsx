import Image from "next/image";
import { revealStep } from "@/components/landing/reveal";
import { SectionBadge } from "@/components/landing/section-badge";
import { SLIDE_IMAGE } from "@/components/landing/slide-image";
import { SnapCarousel } from "@/components/landing/snap-carousel";
import { cn } from "@/lib/cn";
import { FEATURES, type Feature, type FeatureId } from "@/lib/landing";

const IMG = "/images/landing";

/** Each text block is centred on its y, as the design places it. */
const BLOCK = "absolute flex -translate-y-1/2 flex-col justify-center";

/** Card box, pill, title and body positions on the 1440 board. */
const DESKTOP: Record<
  FeatureId,
  { card: string; pill: string; title: string; body: string }
> = {
  send: {
    card: "h-458 w-740",
    pill: "top-38.75 left-39",
    title: "top-147.75 left-39 h-93.75 w-253.5 text-u-32/34 -tracking-u-1.5",
    body: "top-262.75 left-39 h-114 w-294",
  },
  receive: {
    card: "h-458 flex-1",
    pill: "top-38.75 left-38.25",
    title: "top-154.5 left-38.25 h-138.5 w-334.25 text-u-32/34 -tracking-u-1.5",
    body: "top-272.5 left-38 h-75 w-193 text-jumpa-ink-soft",
  },
  swap: {
    card: "",
    pill: "top-39.5 left-37.5",
    title:
      "top-147.5 left-38 h-101 w-335 font-inter text-u-30/34 -tracking-u-1",
    body: "top-254 left-39.5 h-74.25 w-310",
  },
  save: {
    card: "",
    pill: "top-38.25 left-38.25",
    title: "top-121.5 left-38.25 h-70.25 w-328.25 text-u-32/34 -tracking-u-1",
    body: "top-196.75 left-38.25 h-47.75 w-309.75",
  },
  spend: {
    card: "",
    pill: "top-39.5 left-39.75",
    title: "top-123 left-39.75 h-71 w-259.25 text-u-32/34 -tracking-u-1",
    body: "top-208 left-39.75 h-74.25 w-307.75",
  },
};

/** The phone frame's title metrics differ per card; everything else is shared. */
const MOBILE_TITLE: Record<FeatureId, string> = {
  send: "text-u-24/25.5 -tracking-u-1",
  receive: "text-u-24/29.75 -tracking-u-1.25",
  swap: "text-u-24/29 -tracking-u-1",
  save: "text-u-24/25.5 -tracking-u-0.75",
  spend: "text-u-24/25.5 -tracking-u-0.75",
};

const DESKTOP_ART = {
  send: { width: 1480, height: 916, sizes: "(min-width: 1440px) 740px, 52vw" },
  receive: {
    width: 932,
    height: 916,
    sizes: "(min-width: 1440px) 466px, 33vw",
  },
  swap: { width: 791, height: 944, sizes: "(min-width: 1440px) 396px, 28vw" },
  save: { width: 791, height: 944, sizes: "(min-width: 1440px) 396px, 28vw" },
  spend: { width: 791, height: 944, sizes: "(min-width: 1440px) 396px, 28vw" },
} as const;

const PILL =
  "flex items-center whitespace-nowrap rounded-full bg-jumpa-primary-600 px-14 font-semibold text-jumpa-alt-400";

function DesktopCard({ feature, step }: { feature: Feature; step: number }) {
  const layout = DESKTOP[feature.id];
  const art = DESKTOP_ART[feature.id];
  return (
    <article
      style={revealStep(step)}
      className={cn(
        "reveal relative overflow-clip rounded-u-38.25 bg-jumpa-surface text-jumpa-ink",
        layout.card,
      )}
    >
      <Image
        src={`${IMG}/feature-${feature.id}.webp`}
        width={art.width}
        height={art.height}
        sizes={art.sizes}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <p
        className={cn(PILL, "absolute h-34.25 text-u-13.75/21.5", layout.pill)}
      >
        {feature.pill}
      </p>
      <h3
        className={cn(BLOCK, "whitespace-pre-line font-semibold", layout.title)}
      >
        {feature.title}
      </h3>
      <p
        className={cn(
          BLOCK,
          "text-u-17/23.25 -tracking-u-0.5 opacity-85",
          layout.body,
        )}
      >
        {feature.body}
      </p>
    </article>
  );
}

function MobileCard({ feature }: { feature: Feature }) {
  return (
    <article className="relative h-432 w-362 shrink-0 snap-start overflow-clip rounded-u-24 bg-jumpa-surface text-jumpa-ink">
      <Image
        src={`${IMG}/feature-${feature.id}-mobile.webp`}
        width={724}
        height={864}
        sizes="(min-width: 768px) 1px, 90vw"
        alt=""
        {...SLIDE_IMAGE}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute top-23 left-20 flex w-322 flex-col items-start gap-16">
        <p className={cn(PILL, "h-26 text-u-10/21.5")}>{feature.pill}</p>
        <h3
          className={cn(
            "whitespace-pre-line font-semibold",
            MOBILE_TITLE[feature.id],
          )}
        >
          {feature.title}
        </h3>
        <p className="text-u-14/19 -tracking-u-0.5">{feature.body}</p>
      </div>
    </article>
  );
}

export function FeaturesSection() {
  const [send, receive, ...rest] = FEATURES.cards;
  return (
    <section
      id="features"
      className="-mt-36 scroll-mt-65 md:mt-0 md:scroll-mt-95"
    >
      <div className="relative mx-auto h-755 w-402 md:h-1400 md:w-1440">
        <SectionBadge className="reveal absolute top-56 left-20 md:top-99 md:left-108.5">
          {FEATURES.badge}
        </SectionBadge>
        <h2
          style={revealStep(1)}
          className="reveal absolute inset-x-20 top-100 font-semibold text-jumpa-ink text-u-32/37.25 -tracking-u-1.75 md:top-173 md:right-auto md:left-107 md:w-897 md:text-u-60/70 md:-tracking-u-3.25"
        >
          {FEATURES.heading}
        </h2>

        <div className="absolute top-352 left-106 hidden h-964 w-1228 grid-cols-3 grid-rows-2 gap-x-21 gap-y-20 md:grid">
          <div className="col-span-3 flex items-center gap-21">
            <DesktopCard feature={send} step={2} />
            <DesktopCard feature={receive} step={3} />
          </div>
          {rest.map((feature, i) => (
            <DesktopCard key={feature.id} feature={feature} step={i + 4} />
          ))}
        </div>

        <SnapCarousel
          label={FEATURES.badge}
          count={FEATURES.cards.length}
          className="reveal absolute inset-x-0 top-231 md:hidden"
          trackClassName="scroll-px-20 gap-31 px-20"
        >
          {FEATURES.cards.map((feature) => (
            <MobileCard key={feature.id} feature={feature} />
          ))}
        </SnapCarousel>
      </div>
    </section>
  );
}
