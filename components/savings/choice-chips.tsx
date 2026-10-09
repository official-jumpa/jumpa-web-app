"use client";

import {
  SLIDE_GLIDE,
  SLIDE_LAYER,
  slideSlot,
} from "@/components/ui/slide-slot";
import { cn } from "@/lib/cn";

const RESTING = "border-[1.32px] border-jumpa-primary-100 bg-jumpa-primary-50";
const PICKED = "bg-jumpa-primary-600";
const LABEL = { on: "text-jumpa-primary-50", off: "text-jumpa-primary-950" };
const RATE = { on: "text-jumpa-alt-400", off: "text-jumpa-primary-600" };
/** Sliding, the picked chip's text waits for the thumb, or it turns white on the lavender well. */
const ARRIVE = "transition-colors duration-200 ease-jumpa";
/** The row's `gap-2`, in spacing units — the thumb's travel is built from it. */
const GAP = 2;

/**
 * Pill row used for lock terms, target terms and goal categories.
 *
 * `caption` turns a chip two-line — the term on top, the rate it earns under
 * it — so the rate is visible while choosing rather than after.
 */
export function ChoiceChips({
  options,
  value,
  onChange,
  caption,
  slide = false,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
  /** Returns the second line for an option, or nothing for a one-line chip. */
  caption?: (option: string) => string | undefined;
  /** One thumb glides to the picked chip instead of each chip swapping colour. */
  slide?: boolean;
}) {
  const picked = options.indexOf(value);

  return (
    <div
      className={slide ? "relative isolate flex gap-2" : "flex flex-wrap gap-2"}
    >
      {slide
        ? options.map((option, index) => (
            <span
              key={option}
              aria-hidden="true"
              className={cn(SLIDE_LAYER, RESTING)}
              style={slideSlot(options.length, index, GAP)}
            />
          ))
        : null}
      {slide && picked >= 0 ? (
        <span
          aria-hidden="true"
          className={cn(SLIDE_LAYER, SLIDE_GLIDE, PICKED)}
          style={slideSlot(options.length, picked, GAP)}
        />
      ) : null}

      {options.map((option) => {
        const active = option === value;
        const second = caption?.(option);
        const tone = (text: typeof LABEL) => (active ? text.on : text.off);
        const arrive = slide && cn(ARRIVE, active && "delay-100");
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={cn(
              "tap flex min-w-0 flex-1 flex-col items-center justify-center rounded-pill px-2 whitespace-nowrap active:scale-95",
              second ? "h-12 gap-0.5" : "h-9",
              // Sliding, the button is bare: the wells and thumb behind it carry the shape.
              slide ? "relative" : cn(active ? PICKED : RESTING, tone(LABEL)),
            )}
          >
            <span
              className={cn(
                "text-xs leading-4 font-medium",
                arrive,
                slide && tone(LABEL),
              )}
            >
              {option}
            </span>
            {second ? (
              <span
                className={cn(
                  "text-[10px] leading-3 font-semibold",
                  arrive,
                  tone(RATE),
                )}
              >
                {second}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
