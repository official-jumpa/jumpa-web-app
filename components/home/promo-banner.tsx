"use client";

import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { getNetwork } from "@/lib/bills";
import { cn } from "@/lib/cn";

/** How long each slide holds before the next one takes over. */
const HOLD_MS = 4500;

/** Travel before the gesture commits to an axis, and before it counts. */
const SLOP = 8;
const SWIPE_MIN = 40;

/** A tap that lands this soon after a drag is the drag's own ghost click. */
const GHOST_MS = 300;

export type PromoSlide = {
  id: string;
  /** Omitted while the slide's screen isn't available; it then only shows. */
  href?: string;
  label: string;
  Art: () => React.ReactNode;
};

const SAVINGS: PromoSlide = {
  id: "savings",
  href: "/savings",
  label: "Save for what's next. Earn up to 15% interest p.a. on your savings.",
  Art: SavingsArt,
};

const AIRTIME: PromoSlide = {
  id: "airtime",
  href: "/airtime",
  label: "Get airtime. Get data. Stay connected.",
  Art: AirtimeArt,
};

const ONE_APP: PromoSlide = {
  id: "one-app",
  href: "/more",
  label:
    "One app. More ways to move. Send, save, spend and trade, all in one place.",
  Art: OneAppArt,
};

export const PROMO_SLIDES = {
  savings: SAVINGS,
  airtime: AIRTIME,
  oneApp: ONE_APP,
};

const HOME_SLIDES = [SAVINGS, AIRTIME, ONE_APP];

/**
 * Home's promo banner. Slides cross-fade and drift — opacity and transform
 * only, so nothing reflows — and a horizontal swipe steps them by hand.
 */
export function PromoBanner({
  slides = HOME_SLIDES,
  onNavigate,
}: {
  slides?: PromoSlide[];
  /** Hands a slide's route to a host that owns its navigation. */
  onNavigate?: (href: string) => void;
} = {}) {
  const [index, setIndex] = useState(0);
  const drag = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(
    null,
  );
  const swipedAt = useRef(0);
  const count = slides.length;
  const active = index;

  // Keyed on `active`, so a swipe gives the chosen slide a full hold.
  // biome-ignore lint/correctness/useExhaustiveDependencies: active is the trigger; dropping it would never restart the hold
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(
      () => setIndex((current) => (current + 1) % count),
      HOLD_MS,
    );
    return () => clearTimeout(id);
  }, [active]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (!event.isPrimary) return;
    drag.current = { x: event.clientX, y: event.clientY, axis: null };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const held = drag.current;
    if (!held || held.axis) return;
    const dx = event.clientX - held.x;
    const dy = event.clientY - held.y;
    if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
    // A vertical intent belongs to the page, so the gesture is handed back.
    if (Math.abs(dy) > Math.abs(dx)) drag.current = null;
    else held.axis = "x";
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const held = drag.current;
    drag.current = null;
    if (held?.axis !== "x") return;
    const dx = event.clientX - held.x;
    if (Math.abs(dx) < SWIPE_MIN) return;
    swipedAt.current = Date.now();
    setIndex((active + (dx < 0 ? 1 : -1) + count) % count);
  };

  return (
    // The top pad is the headroom the old pop-out art took, so the card stays where Home draws it.
    <div className="flex flex-col items-center gap-2.5 pt-3.75">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the slides inside are links; this only adds a swipe */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
        }}
        // A drag that ends on a slide must not also open it.
        onClickCapture={(event) => {
          if (Date.now() - swipedAt.current < GHOST_MS) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onDragStart={(event) => event.preventDefault()}
        className="relative aspect-357/103 w-full touch-pan-y"
      >
        {slides.map(({ id, href, label, Art }, position) => {
          // 0 is on screen, 1 waits on the right, the rest have left to the left.
          const step = (position - active + count) % count;
          const className = cn(
            "absolute inset-0 transition-[opacity,transform] duration-700 ease-jumpa",
            step === 0
              ? "translate-x-0 opacity-100"
              : step === 1
                ? "pointer-events-none translate-x-3 opacity-0"
                : "pointer-events-none -translate-x-3 opacity-0",
          );
          return href ? (
            <Link
              key={id}
              prefetch
              href={href}
              aria-label={label}
              aria-hidden={step !== 0}
              tabIndex={step === 0 ? undefined : -1}
              onClick={(event) => {
                if (!onNavigate || event.metaKey || event.ctrlKey) return;
                event.preventDefault();
                onNavigate(href);
              }}
              className={className}
            >
              <Art />
            </Link>
          ) : (
            <div
              key={id}
              role="img"
              aria-label={label}
              aria-hidden={step !== 0}
              className={className}
            >
              <Art />
            </div>
          );
        })}
      </div>

      <span
        aria-hidden="true"
        className="flex gap-0.5 rounded-pill border border-jumpa-primary-100 bg-jumpa-primary-50 p-1"
      >
        {slides.map(({ id }, position) => (
          <span
            key={id}
            className={cn(
              "h-2 w-4.25 rounded-pill transition-colors duration-700 ease-jumpa",
              position === active
                ? "bg-jumpa-primary-600"
                : "bg-jumpa-primary-100",
            )}
          />
        ))}
      </span>
    </div>
  );
}

/** Where the ad artwork lives. */
const ART = "/images/promo";

/** The 357×103 ad artboard. It scales as one piece, so sizes inside read as design px. */
function AdFrame({
  className,
  children,
}: {
  /** The card's ground. */
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span className="frame-357 block size-full">
      <span
        className={cn(
          "relative isolate block h-103 w-357 overflow-hidden rounded-u-20",
          className,
        )}
      >
        {children}
      </span>
    </span>
  );
}

/** Motion ticks off the savings coin: one stroke, placed three times. */
const COIN_TICKS = [
  "top-31.75 left-215.25 rotate-[19.37deg]",
  "top-28.5 left-220.25 rotate-[42.78deg]",
  "top-37.25 left-212 rotate-[-7.75deg]",
];

function SavingsArt() {
  return (
    <AdFrame className="bg-jumpa-primary-600">
      <Image
        src={`${ART}/savings-chart.webp`}
        alt=""
        width={348}
        height={116}
        loading="eager"
        className="absolute top-0 left-16 h-116 w-348.25 max-w-none mix-blend-lighten"
      />
      <span className="absolute top-65.5 left-27 text-u-10.75/10 font-medium tracking-jumpa-snug whitespace-nowrap text-jumpa-white">
        <span className="block">
          Earn up to <span className="font-bold text-jumpa-alt-400">15%</span>{" "}
          interest
        </span>
        <span className="block">p.a. on your savings.</span>
      </span>
      <span className="absolute top-15.5 left-19.25 w-140 -rotate-1 -skew-x-11 scale-y-98 text-u-20.75/19 font-extrabold tracking-jumpa-tight whitespace-nowrap text-jumpa-white">
        <span className="block">SAVE FOR</span>
        <span className="block bg-linear-to-r from-jumpa-alt-400 via-jumpa-alt-250 via-[44.231%] to-jumpa-alt-400 to-[98.558%] bg-clip-text text-transparent">
          WHAT’S NEXT.
        </span>
      </span>
      {/* Drawn on a slant; the turn stands it upright beside the copy. */}
      <Image
        src={`${ART}/savings-rule.svg`}
        alt=""
        width={19}
        height={11}
        className="absolute top-70.5 left-11 h-11.25 w-18.75 max-w-none rotate-60"
      />
      <Image
        src={`${ART}/savings-underline.svg`}
        alt=""
        width={79}
        height={6}
        className="absolute top-53.25 left-74.25 h-6.25 w-78.75 max-w-none"
      />
      <Image
        src={`${ART}/savings-piggy.webp`}
        alt=""
        width={84}
        height={93}
        loading="eager"
        className="absolute top-14 left-196 h-93 w-84.25 max-w-none"
      />
      {COIN_TICKS.map((place) => (
        <Image
          key={place}
          src={`${ART}/savings-spark.svg`}
          alt=""
          width={9}
          height={6}
          className={cn("absolute h-6 w-8.75 max-w-none", place)}
        />
      ))}
    </AdFrame>
  );
}

/** Carrier discs on the airtime ad, back to front; logos and tints come from the bills list. */
const AD_CARRIERS = [
  { id: "9mobile", disc: "top-42.5 left-203 size-22", mark: "size-14" },
  {
    id: "glo",
    // Glo's disc in the art is the success green.
    disc: "top-35.25 left-229.25 size-22 bg-jumpa-success",
    mark: "size-15",
  },
  { id: "airtel", disc: "top-28 left-212.5 size-22", mark: "size-12" },
  {
    id: "mtn",
    disc: "top-48 left-219.5 size-21.75",
    mark: "size-full object-cover",
  },
];

function AirtimeArt() {
  return (
    <AdFrame className="bg-linear-[170.453deg] from-jumpa-primary-600 from-[25.788%] to-jumpa-primary-925 to-[95.164%]">
      <Image
        src={`${ART}/airtime-street.webp`}
        alt=""
        width={264}
        height={148}
        className="absolute -top-26 -left-7 h-147.5 w-264.25 max-w-none object-cover"
      />
      <Image
        src={`${ART}/airtime-man.webp`}
        alt=""
        width={296}
        height={165}
        className="absolute -top-31 left-61 h-165 w-296 max-w-none object-cover"
      />
      <Image
        src={`${ART}/airtime-glow.svg`}
        alt=""
        width={480}
        height={372}
        className="absolute -top-146.5 -left-180 h-372.5 w-480.25 max-w-none"
      />
      <span className="absolute top-29.25 left-18 w-182 text-u-17.5/17.75 font-bold tracking-jumpa-snug whitespace-nowrap text-jumpa-white">
        <span className="block bg-linear-to-r from-jumpa-alt-400 via-jumpa-alt-350 via-[49.048%] to-jumpa-alt-400 bg-clip-text text-transparent">
          Get Airtime. Get Data.
        </span>
        <span className="block">Stay Connected.</span>
      </span>
      <Image
        src={`${ART}/airtime-wave.svg`}
        alt=""
        width={120}
        height={55}
        className="absolute top-55 -left-7 h-54.75 w-120 max-w-none -scale-x-100"
      />
      {AD_CARRIERS.map(({ id, disc, mark }) => {
        const network = getNetwork(id);
        return network ? (
          <span
            key={id}
            style={{ backgroundColor: network.tint }}
            className={cn(
              "absolute flex items-center justify-center overflow-hidden rounded-full",
              disc,
            )}
          >
            <Image
              src={network.logo}
              alt=""
              width={22}
              height={22}
              className={cn("max-w-none", mark)}
            />
          </span>
        ) : null;
      })}
      <Image
        src={`${ART}/airtime-phone.webp`}
        alt=""
        width={14}
        height={29}
        className="absolute top-66 left-262 h-29.25 w-13.5 max-w-none"
      />
    </AdFrame>
  );
}

function OneAppArt() {
  return (
    <AdFrame className="bg-jumpa-primary-600">
      <Image
        src={`${ART}/one-app-wallpaper.webp`}
        alt=""
        width={114}
        height={202}
        className="absolute -top-49.5 left-45.25 h-202.25 w-113.75 max-w-none rotate-[-88.97deg] object-cover mix-blend-multiply"
      />
      <Image
        src={`${ART}/one-app-glow-right.svg`}
        alt=""
        width={296}
        height={181}
        className="absolute -top-58.5 left-173.5 h-180.75 w-295.75 max-w-none"
      />
      <Image
        src={`${ART}/one-app-glow-left.svg`}
        alt=""
        width={139}
        height={201}
        className="absolute -top-59 -left-68 h-201 w-139 max-w-none"
      />
      <span className="absolute top-65.5 left-17 text-u-9/10 tracking-jumpa-snug whitespace-nowrap text-jumpa-white">
        Send. Save. Spend. Trade. All in one place.
      </span>
      <span className="absolute top-30.25 left-15 text-u-16/16.5 font-extrabold tracking-jumpa-snug whitespace-nowrap text-jumpa-white uppercase">
        <span className="block text-jumpa-alt-400">One app.</span>
        <span className="block">More ways to move.</span>
      </span>
      <Image
        src={`${ART}/one-app-woman.webp`}
        alt=""
        width={201}
        height={112}
        className="absolute top-0 left-160 h-112 w-200.75 max-w-none object-cover"
      />
      <Image
        src={`${ART}/one-app-plane.svg`}
        alt=""
        width={78}
        height={36}
        className="absolute top-26 left-155.5 h-36.5 w-78 max-w-none rotate-[-172.44deg] -scale-y-100"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-jumpa-ad-rim"
      />
    </AdFrame>
  );
}
