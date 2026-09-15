import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The glossy purple illustrations — the shield sphere, the microphone disc, the
 * PIN pill and the blank orb behind the review mockup. All four are the same
 * shell (a rounded purple box with a translucent rim) under the same three
 * blurred highlight shapes, so they share one component. `className` positions
 * the wrapper and gives it a width in the parent's units.
 */
type Variant = "sphere" | "mic" | "review" | "pin";

const SHELL = "relative isolate overflow-clip bg-jumpa-primary-600";

const SHELLS: Record<Variant, string> = {
  sphere: "h-417 w-417 rounded-u-290 shadow-u-73.25/30",
  mic: "h-486.75 w-417 rounded-u-290 shadow-u-90.75/50",
  review: "h-417 w-417 rounded-u-100 shadow-u-73.25/30",
  pin: "h-178 w-508.25 rounded-u-74.5 shadow-u-103.5/30",
};

/**
 * The rim is drawn over the gloss, not as a border on the shell: `overflow-clip`
 * clips to the padding box, so a border kept the highlights out of its band and
 * the opaque fill showed through the 20% purple, reading solid.
 */
const RIM =
  "pointer-events-none absolute inset-0 rounded-[inherit] border-jumpa-primary-600/20";

const RIMS: Record<Variant, string> = {
  sphere: "border-u-21.75",
  mic: "border-u-21.75",
  review: "border-u-21.75",
  pin: "border-u-15",
};

const LAYER =
  "pointer-events-none absolute -z-10 max-w-none mix-blend-plus-lighter";

type Highlight = { src: string; className: string };

/**
 * The three shapes, in the round shells' own 417 units. A flipped copy is
 * mirrored about its own centre, so it keeps the position the design gives it —
 * offsetting it by its own height is what used to push the right-hand gloss down.
 */
const ROUND: Highlight[] = [
  { src: "orb-circle", className: "-left-21.75 top-140 h-628.75 w-628.75" },
  { src: "orb-oval", className: "-left-200.5 top-59.25 h-415.5 w-428.25" },
  {
    src: "orb-oval",
    className: "left-150.25 -top-156.75 h-415.5 w-428.25 -scale-y-100",
  },
  { src: "orb-blob", className: "-left-185.25 -top-250.25 h-572.75 w-659.5" },
  {
    src: "orb-blob",
    className: "left-110.75 -top-77.25 h-572.75 w-659.5 -scale-y-100",
  },
];

/** The same shapes scaled into the wider, shorter PIN pill. */
const PIN: Highlight[] = [
  { src: "orb-circle", className: "-left-14.75 top-213.75 h-888.25 w-888.25" },
  { src: "orb-oval", className: "-left-267.25 top-99.75 h-587 w-605" },
  {
    src: "orb-oval",
    className: "left-228.25 -top-205.75 h-587 w-605 -scale-y-100",
  },
  { src: "orb-blob", className: "-left-246 -top-337.75 h-809.5 w-932" },
  {
    src: "orb-blob",
    className: "left-172.5 -top-93.25 h-809.5 w-932 -scale-y-100",
  },
];

type GlowOrbProps = {
  variant: Variant;
  /** Position plus a width in the parent's units. */
  className: string;
  /** The centred glyph, if the variant has one. */
  children?: ReactNode;
};

export function GlowOrb({ variant, className, children }: GlowOrbProps) {
  const isPin = variant === "pin";
  const highlights = isPin ? PIN : ROUND;
  return (
    <div
      className={cn(
        isPin ? "frame-508.25" : "frame-417",
        "pointer-events-none",
        className,
      )}
    >
      <div className={cn(SHELL, SHELLS[variant])}>
        {children}
        {highlights.map((layer) => (
          <img
            key={`${layer.src}${layer.className}`}
            src={`/images/landing/${layer.src}.svg`}
            alt=""
            aria-hidden="true"
            className={cn(LAYER, layer.className)}
          />
        ))}
        {isPin ? (
          <img
            src="/images/landing/pin-asterisks.svg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 m-auto h-75.5 w-340.5 max-w-none"
          />
        ) : null}
        <span aria-hidden="true" className={cn(RIM, RIMS[variant])} />
      </div>
    </div>
  );
}
