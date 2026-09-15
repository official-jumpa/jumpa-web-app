import { cn } from "@/lib/cn";

/**
 * The blurred dot-grid glow behind the hero, How it works, Why Jumpa,
 * Security and FAQ. Every instance in the design is the same composition
 * (a soft ellipse masking a scaled dot grid) at a different size, so this is
 * one frame in the desktop glow's own units: `className` places the ellipse's
 * bounding box (`left`/`top`) and sets its width — 1440 for the desktop
 * default, 714.5 on phones, 1537.75 for the wide Security/FAQ instances.
 * Paints at `-z-10`, so the section it lives in must not be a stacking
 * context of its own unless it means to (see `WhyJumpaSection`).
 */
type DotGlowProps = {
  tone: "purple" | "grey";
  className: string;
};

const DOTS = {
  purple: "bg-jumpa-secondary-600 bg-[url(/images/landing/dot-grid.svg)]",
  grey: "bg-[url(/images/landing/dot-grid-grey.svg)]",
} as const;

export function DotGlow({ tone, className }: DotGlowProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "frame-1440 pointer-events-none absolute -z-10 h-0",
        className,
      )}
    >
      <div className="absolute -top-499.25 -left-499.25 h-1391.25 w-2438.25 overflow-hidden mask-[url(/images/landing/glow-mask.svg)] mask-alpha mask-no-repeat mask-size-[100%_100%]">
        <div
          className={cn(
            "absolute -top-205.75 left-377.75 h-2812.25 w-4103.5 bg-size-[100%_100%]",
            DOTS[tone],
          )}
        />
      </div>
    </div>
  );
}
