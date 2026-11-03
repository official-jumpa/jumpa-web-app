"use client";

import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { MessageCircleDotsIcon } from "@/components/ui/icons/message-circle-dots";
import { cn } from "@/lib/cn";

/** How long each slide holds before the next one takes over. */
const HOLD_MS = 4500;

/** Travel before the gesture commits to an axis, and before it counts. */
const SLOP = 8;
const SWIPE_MIN = 40;

/** A tap that lands this soon after a drag is the drag's own ghost click. */
const GHOST_MS = 300;

type Slide = {
  id: string;
  href: string;
  label: string;
  Art: () => React.ReactNode;
};

const VERIFY: Slide = {
  id: "verify",
  href: "/kyc",
  label: "Verify your identity",
  Art: VerifyArt,
};

const SAVINGS: Slide = {
  id: "savings",
  href: "/savings",
  label: "Start saving and earn up to 15% interest p.a.",
  Art: SavingsArt,
};

const CHAT: Slide = {
  id: "chat",
  href: "/home/chat",
  label: "Chat, don't tap. Send, swap and save just by telling Jumpa.",
  Art: ChatArt,
};

const slides = [SAVINGS, VERIFY, CHAT];

/**
 * Home's promo banner. Slides cross-fade and drift — opacity and transform
 * only, so nothing reflows — and a horizontal swipe steps them by hand.
 */
export function PromoBanner() {
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
    <div className="flex flex-col items-center gap-2.5">
      {/* The art pokes 15px above the card, so the box reserves it. */}
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
        className="relative h-29.5 w-full touch-pan-y"
      >
        {slides.map(({ id, href, label, Art }, position) => {
          // 0 is on screen, 1 waits on the right, the rest have left to the left.
          const step = (position - active + count) % count;
          return (
            <Link
              key={id}
              prefetch
              href={href}
              aria-label={label}
              aria-hidden={step !== 0}
              tabIndex={step === 0 ? undefined : -1}
              className={cn(
                "absolute inset-0 transition-[opacity,transform] duration-700 ease-jumpa",
                step === 0
                  ? "translate-x-0 opacity-100"
                  : step === 1
                    ? "pointer-events-none translate-x-3 opacity-0"
                    : "pointer-events-none -translate-x-3 opacity-0",
              )}
            >
              <Art />
            </Link>
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

/** The 103px purple card every slide sits on, with its wave and glows. */
function SlideCard({
  tilt,
  children,
}: {
  /** The verify slide tips its wave and sits 3px higher; the savings slide lays it flat. */
  tilt?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "absolute inset-x-0 isolate block h-25.75 overflow-hidden rounded-row bg-jumpa-primary-600",
        tilt ? "bottom-0.75" : "bottom-0",
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        {/* The wave goes down first; the glows over it are what lift it off the card. */}
        <Image
          src="/images/home/banner-wave.svg"
          alt=""
          width={252}
          height={84}
          className={cn(
            "absolute max-w-none",
            tilt ? "top-12 -right-9.75 rotate-[7.29deg]" : "top-5 -right-10.75",
          )}
        />
        <Image
          src="/images/home/banner-glow-wide.svg"
          alt=""
          width={296}
          height={181}
          className="absolute top-1.5 -left-px max-w-none"
        />
        <Image
          src="/images/home/banner-glow.svg"
          alt=""
          width={244}
          height={201}
          className="absolute -top-8 -right-14.5 max-w-none"
        />
        <Image
          src="/images/home/banner-glow.svg"
          alt=""
          width={244}
          height={201}
          className="absolute -top-1 -left-27.25 max-w-none"
        />
        {tilt ? (
          <Image
            src="/images/home/banner-glow.svg"
            alt=""
            width={244}
            height={201}
            className="absolute -top-5.25 left-6.25 max-w-none"
          />
        ) : null}
      </span>
      {children}
    </span>
  );
}

function SavingsArt() {
  return (
    <>
      <SlideCard>
        <span className="absolute top-[calc(50%-1px)] left-6.5 w-37.25 -translate-y-1/2 text-[18.5px] leading-5 font-semibold tracking-jumpa-snug text-jumpa-white">
          Start saving and earn up to{" "}
          <span className="text-jumpa-alt-400">15%</span> interest p.a.
        </span>
      </SlideCard>
      <Image
        src="/images/home/banner-shadow.svg"
        alt=""
        width={91}
        height={24}
        className="pointer-events-none absolute top-23.5 right-6.25 max-w-none"
      />
      <Image
        src="/images/home/piggy-bank.webp"
        alt=""
        width={136}
        height={136}
        priority
        className="pointer-events-none absolute -top-2.5 right-1.25 max-w-none"
      />
    </>
  );
}

function VerifyArt() {
  return (
    <SlideCard tilt>
      <span className="absolute top-5.5 left-5.25 text-[18.5px] leading-5 font-semibold tracking-jumpa-snug text-jumpa-white">
        Verify your identity
      </span>
      <span className="absolute top-11.75 left-5.25 w-51.5 text-[10px] leading-3 tracking-jumpa-snug text-jumpa-white">
        A quick verification helps us keep your account secure and meet
        regulatory requirements.
      </span>
      <Image
        src="/images/home/verified-badge.webp"
        alt=""
        width={88}
        height={85}
        priority
        className="pointer-events-none absolute top-1.25 right-7.75 h-21.25 w-22 max-w-none"
      />
      <Image
        src="/images/home/badge-check.svg"
        alt=""
        width={29}
        height={22}
        className="pointer-events-none absolute top-9.5 right-15 max-w-none"
      />
    </SlideCard>
  );
}

/** Chat, don't tap: a "send money" message floating off a lime chat disc. */
function ChatArt() {
  return (
    <>
      <SlideCard>
        <span className="absolute top-5.5 left-6.5 text-[18.5px] leading-5 font-semibold tracking-jumpa-snug text-jumpa-white">
          Chat, <span className="text-jumpa-alt-400">don't tap</span>
        </span>
        <span className="absolute top-12.25 left-6.5 w-38 text-[10px] leading-3 tracking-jumpa-snug text-jumpa-white">
          Send, swap and save just by telling Jumpa what you need.
        </span>
      </SlideCard>
      <span className="pointer-events-none absolute top-2 right-7 flex size-15 -rotate-8 items-center justify-center rounded-full bg-jumpa-alt-400 text-jumpa-primary-600 shadow-jumpa-sm">
        <MessageCircleDotsIcon className="size-8.5" />
      </span>
      <Image
        src="/images/landing/cta-message-dollars.webp"
        alt=""
        width={303}
        height={109}
        className="pointer-events-none absolute top-16 right-17.5 h-8 w-22.25 max-w-none rotate-3"
      />
    </>
  );
}
