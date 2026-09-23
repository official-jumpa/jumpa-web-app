"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BILL_ADS } from "@/lib/bills";

/** How long each offer holds before the next one fades in. */
const HOLD_MS = 5000;

/**
 * Offer art above the recharge forms. Cross-fades between the ads — opacity and
 * a small scale only, so nothing reflows and the work stays on the compositor.
 *
 * All four load up front rather than lazily: they are stacked in one box, the
 * set is 115 KB total, and a lazy frame shows blank the first time it fades in.
 */
export function BillBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setIndex((current) => (current + 1) % BILL_ADS.length),
      HOLD_MS,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative aspect-[393/173] w-full overflow-hidden">
      {BILL_ADS.map((ad, position) => (
        <Image
          key={ad.id}
          src={ad.src}
          alt=""
          fill
          // The first is the LCP and gets a preload; the rest fetch straight
          // away at low priority so they never compete with it.
          priority={position === 0}
          loading="eager"
          fetchPriority={position === 0 ? "high" : "low"}
          sizes="(max-width: 500px) 100vw, 500px"
          className={`object-cover transition-[opacity,transform] duration-700 ease-jumpa ${
            position === index ? "scale-100 opacity-100" : "scale-105 opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
