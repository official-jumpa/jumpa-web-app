"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ADS, type Ad } from "@/lib/wallet";

/** How long each ad holds before the next one takes over. */
const HOLD_MS = 4500;

/** Track widths. The two sum to a constant, so the pill never changes size. */
const DOT_MIN = 14;
const DOT_MAX = 22;

/**
 * Home's offer banner. Ads cross-fade and drift one step left — opacity and
 * transform only, so nothing reflows and the work stays on the compositor.
 */
export function AdBanner({ ads = ADS }: { ads?: Ad[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (ads.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(
      () => setIndex((current) => (current + 1) % ads.length),
      HOLD_MS,
    );
    return () => clearInterval(id);
  }, [ads.length]);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* The box matches the art's own ratio, so the 80px slot is fixed from
          the first paint. Corners are already rounded in the art. */}
      <div className="relative aspect-[536/120] w-full overflow-hidden">
        {ads.map((ad, position) => {
          // 0 is on screen, 1 waits on the right, the rest have left to the left.
          const step = (position - index + ads.length) % ads.length;
          const active = step === 0;

          return (
            <Link
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
