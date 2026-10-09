import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

type Variant = {
  /** Track layout when each option carries its own background. */
  display: string;
  /** Same, sliding: equal columns, so the thumb travels in fixed steps. */
  grid: string;
  frame: string;
  /** The frame's `gap-*` and `p-*` in spacing units — the thumb's travel is built from them. */
  gap: number;
  pad: number;
  option: string;
  /** Background of the picked option; the part that slides. */
  thumb: string;
  /** Background of the others, if they have one. */
  well?: string;
  onText: string;
  offText: string;
};

/** Compact switch inside a track — "12 WORDS" / "24 WORDS". */
const CHIP: Variant = {
  display: "inline-flex",
  grid: "inline-grid",
  frame: "gap-1 rounded-pill bg-jumpa-neutral-50 p-1",
  gap: 1,
  pad: 1,
  option:
    "flex items-center justify-center gap-1 rounded-pill px-2.5 py-2 text-[10px] leading-3 font-medium",
  thumb: "bg-jumpa-primary-600",
  onText: "text-jumpa-alt-400",
  offText: "text-jumpa-primary-950",
};

/** Two full-width pills side by side — the bank/mobile-money destination. */
const SPLIT: Variant = {
  display: "flex",
  grid: "grid",
  frame: "gap-4",
  gap: 4,
  pad: 0,
  option:
    "flex h-11.5 flex-1 items-center justify-center gap-1.5 rounded-pill text-sm leading-4 font-medium",
  thumb: "bg-jumpa-primary-600",
  well: "bg-jumpa-primary-50",
  onText: "text-jumpa-white",
  offText: "text-jumpa-primary-950",
};

/** Compact switch on a brand surface — the savings hub's currency toggle. */
const INVERSE: Variant = {
  display: "inline-flex",
  grid: "inline-grid",
  frame: "gap-0.5 rounded-pill bg-jumpa-primary-950/60 p-0.5",
  gap: 0.5,
  pad: 0.5,
  option:
    "flex h-6.5 items-center justify-center rounded-pill px-2.5 text-[10px] leading-3 font-semibold",
  thumb: "bg-jumpa-white shadow-jumpa-sm",
  onText: "text-jumpa-primary-600",
  offText: "text-jumpa-primary-100",
};

const VARIANTS = { chip: CHIP, split: SPLIT, inverse: INVERSE } as const;

/**
 * Not-yet-live tone, shared by both variants: the pill stays in place so the
 * row keeps its shape, and the label softens behind a "Soon" tag rather than
 * disappearing. The blur is what says "unavailable" at a glance.
 */
const MUTED = "cursor-not-allowed bg-jumpa-neutral-50 text-jumpa-neutral-300";
const MUTED_LABEL = "opacity-70 blur-[0.6px]";
const SOON =
  "rounded-pill bg-jumpa-neutral-95 px-1.5 py-0.5 text-[9px] leading-3 font-semibold tracking-jumpa-wide text-jumpa-neutral-400 uppercase";

/** Moves on `translate` only, so the slide stays on the compositor. */
const LAYER = "pointer-events-none absolute rounded-pill";
const GLIDE = "transition-transform duration-300 ease-jumpa";

/** Box and offset of slot `index` out of `count`, measured inside the frame's padding. */
function slot(style: Variant, count: number, index: number): CSSProperties {
  const gap = `calc(var(--spacing) * ${style.gap})`;
  const pad = `calc(var(--spacing) * ${style.pad})`;
  return {
    top: pad,
    bottom: pad,
    left: pad,
    width: `calc((100% - 2 * ${pad} - ${count - 1} * ${gap}) / ${count})`,
    translate: `calc(${index} * (100% + ${gap})) 0`,
  };
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  variant = "chip",
  slide = false,
}: {
  options: readonly { value: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  variant?: keyof typeof VARIANTS;
  /** One thumb glides to the picked option instead of each pill swapping colour. */
  slide?: boolean;
}) {
  const style = VARIANTS[variant];
  const picked = options.findIndex((option) => option.value === value);

  return (
    <div
      className={cn(
        slide
          ? `relative isolate ${style.grid} grid-flow-col auto-cols-fr`
          : style.display,
        style.frame,
      )}
    >
      {slide
        ? options.map((option, index) =>
            style.well ? (
              <span
                key={option.value}
                aria-hidden="true"
                className={cn(LAYER, style.well)}
                style={slot(style, options.length, index)}
              />
            ) : null,
          )
        : null}
      {slide && picked >= 0 ? (
        <span
          aria-hidden="true"
          className={cn(LAYER, GLIDE, style.thumb)}
          style={slot(style, options.length, picked)}
        />
      ) : null}

      {options.map((option) => {
        const selected = option.value === value;
        const tone = option.disabled
          ? MUTED
          : slide
            ? selected
              ? style.onText
              : style.offText
            : selected
              ? cn(style.thumb, style.onText)
              : cn(style.well, style.offText);
        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn("tap", slide && "relative", style.option, tone)}
          >
            <span className={option.disabled ? MUTED_LABEL : undefined}>
              {option.label}
            </span>
            {option.disabled ? <span className={SOON}>Soon</span> : null}
          </button>
        );
      })}
    </div>
  );
}
