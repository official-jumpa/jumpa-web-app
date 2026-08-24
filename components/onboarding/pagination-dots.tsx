"use client";

import { useContext } from "react";
import { cn } from "@/lib/cn";
import { CarouselProgressContext, slideDistance } from "./carousel-progress";
import { ONBOARDING_SLIDES } from "./slides";

const DOT_MIN = 17;
const DOT_MAX = 40;

export function PaginationDots({ className }: { className?: string }) {
  const progress = useContext(CarouselProgressContext);

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
          1 - slideDistance(progress, index, ONBOARDING_SLIDES.length),
        );
        return (
          <span
            key={slide}
            className="relative h-2 overflow-hidden rounded-pill bg-white/65"
            style={{ width: DOT_MIN + (DOT_MAX - DOT_MIN) * weight }}
          >
            <span
              className="absolute inset-0 bg-jumpa-alt-400"
              style={{ opacity: weight }}
            />
          </span>
        );
      })}
    </div>
  );
}
