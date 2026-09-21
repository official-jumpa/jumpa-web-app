"use client";

import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ADS, type Ad } from "@/lib/wallet";

/** How long each ad holds before the next one takes over. */
const HOLD_MS = 4500;

/** Track widths. The two sum to a constant, so the pill never changes size. */
const DOT_MIN = 14;
const DOT_MAX = 22;

/** Travel before the gesture commits to an axis, and before it counts. */
const SLOP = 8;
const SWIPE_MIN = 40;

/** A tap that lands this soon after a drag is the drag's own ghost click. */
const GHOST_MS = 300;

/**
 * Home's offer banner. Ads cross-fade and drift one step left — opacity and
 * transform only, so nothing reflows and the work stays on the compositor.
 * A horizontal swipe steps it by hand; the hold restarts from there.
 */
export function AdBanner({ ads = ADS }: { ads?: Ad[] }) {
  const [index, setIndex] = useState(0);
  const drag = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(
    null,
  );
  const swipedAt = useRef(0);

  const go = (by: number) =>
    setIndex((current) => (current + by + ads.length) % ads.length);

  // A timeout keyed on `index` rather than an interval, so a swipe gives the
  // ad the user chose a full hold instead of whatever was left of the last one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: index is the trigger; dropping it would never restart the hold
  useEffect(() => {
    if (ads.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setTimeout(
      () => setIndex((current) => (current + 1) % ads.length),
      HOLD_MS,
    );
    return () => clearTimeout(id);
  }, [ads.length, index]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (!event.isPrimary || ads.length < 2) return;
    drag.current = { x: event.clientX, y: event.clientY, axis: null };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const held = drag.current;
    if (!held) return;

    const dx = event.clientX - held.x;
    const dy = event.clientY - held.y;

    if (held.axis) return;
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
    go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* The box matches the art's own ratio, so the 80px slot is fixed from
          the first paint. Corners are already rounded in the art. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the ads inside are links; this only adds a swipe */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
        }}
        // A drag that ends on an ad must not also open it.
        onClickCapture={(event) => {
          if (Date.now() - swipedAt.current < GHOST_MS) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onDragStart={(event) => event.preventDefault()}
        className="relative aspect-[536/120] w-full touch-pan-y overflow-hidden"
      >
        {ads.map((ad, position) => {
          // 0 is on screen, 1 waits on the right, the rest have left to the left.
          const step = (position - index + ads.length) % ads.length;
          const active = step === 0;

          return (
            <Link
              prefetch
              key={ad.id}
              href={ad.href}
              aria-hidden={!active}
              tabIndex={active ? undefined : -1}
              className={`absolute inset-0 transition-[opacity,transform] duration-700 ease-jumpa ${
                active
                  ? "translate-x-0 scale-100 opacity-100"
                  : step === 1
                    ? "pointer-events-none translate-x-3 scale-[1.02] opacity-0"
                    : "pointer-events-none -translate-x-3 scale-[0.98] opacity-0"
              }`}
            >
              <Image
                src={ad.src}
                alt={ad.alt}
                fill
                priority={position === 0}
                sizes="(max-width: 450px) 100vw, 450px"
                className="object-contain"
              />
            </Link>
          );
        })}
      </div>

      {ads.length > 1 ? (
        <span
          aria-hidden="true"
          className="flex h-3 items-center gap-1 rounded-pill bg-jumpa-primary-50 px-1"
        >
          {ads.map((ad, position) => (
            <span
              key={ad.id}
              style={{ width: position === index ? DOT_MAX : DOT_MIN }}
              className={`h-1.5 rounded-pill transition-[width,background-color] duration-700 ease-jumpa ${
                position === index
                  ? "bg-jumpa-primary-600"
                  : "bg-jumpa-primary-200"
              }`}
            />
          ))}
        </span>
      ) : null}
    </div>
  );
}
