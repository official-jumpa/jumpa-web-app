"use client";

import { useContext } from "react";
import { cn } from "@/lib/cn";
import { CarouselProgressContext, slideDistance } from "./carousel-progress";
import { ONBOARDING_SLIDES } from "./slides";

const DOT_MIN = 17;
const DOT_MAX = 40;

export function PaginationDots({ className }: { className?: string }) {
  const { position, animated } = useContext(CarouselProgressContext);
  // Under the finger the widths track the scroll; on an auto-advance the position
  // steps, so the browser has to tween it or the lime segment would jump.
  const ease = animated ? "duration-700 ease-jumpa" : "duration-0";

  return (
    <div
      className={cn(
        "mx-auto flex h-4 w-fit items-center gap-0.5 rounded-pill border border-white/30 bg-white/20 p-1",
        className,
      )}
    >
      {ONBOARDING_SLIDES.map((slide, index) => {
        // Weights sum to 1 across the track, so the pill keeps a constant width.
        const weight = Math.max(
          0,
          1 - slideDistance(position, index, ONBOARDING_SLIDES.length),
        );
        return (
          <span
            key={slide}
            className={cn(
              "relative h-2 overflow-hidden rounded-pill bg-white/65 transition-[width]",
              ease,
            )}
            style={{ width: DOT_MIN + (DOT_MAX - DOT_MIN) * weight }}
          >
            <span
              className={cn(
                "absolute inset-0 bg-jumpa-alt-400 transition-opacity",
                ease,
              )}
              style={{ opacity: weight }}
            />
          </span>
        );
      })}
    </div>
  );
}
