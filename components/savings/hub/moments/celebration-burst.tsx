import type { CSSProperties } from "react";

/** Angle, distance and spin per piece — scattered by hand so the burst is not a ring. */
const PIECES = [
  {
    x: -150,
    y: -60,
    spin: -220,
    delay: 0,
    tone: "bg-jumpa-alt-400",
    size: "size-2.5",
  },
  {
    x: -122,
    y: 40,
    spin: 160,
    delay: 60,
    tone: "bg-jumpa-primary-400",
    size: "size-2",
  },
  {
    x: -96,
    y: -118,
    spin: 300,
    delay: 20,
    tone: "bg-jumpa-alt-300",
    size: "size-2",
  },
  {
    x: -62,
    y: 104,
    spin: -140,
    delay: 110,
    tone: "bg-jumpa-primary-200",
    size: "size-2.5",
  },
  {
    x: -30,
    y: -142,
    spin: 200,
    delay: 40,
    tone: "bg-jumpa-alt-400",
    size: "size-2",
  },
  {
    x: 8,
    y: 128,
    spin: -300,
    delay: 150,
    tone: "bg-jumpa-primary-500",
    size: "size-2",
  },
  {
    x: 36,
    y: -136,
    spin: 240,
    delay: 80,
    tone: "bg-jumpa-alt-200",
    size: "size-2.5",
  },
  {
    x: 70,
    y: 96,
    spin: -260,
    delay: 30,
    tone: "bg-jumpa-primary-300",
    size: "size-2",
  },
  {
    x: 104,
    y: -96,
    spin: 180,
    delay: 120,
    tone: "bg-jumpa-alt-400",
    size: "size-2",
  },
  {
    x: 132,
    y: 52,
    spin: -200,
    delay: 70,
    tone: "bg-jumpa-primary-400",
    size: "size-2.5",
  },
  {
    x: 154,
    y: -30,
    spin: 280,
    delay: 140,
    tone: "bg-jumpa-alt-300",
    size: "size-2",
  },
  {
    x: -172,
    y: -8,
    spin: -160,
    delay: 90,
    tone: "bg-jumpa-primary-300",
    size: "size-2",
  },
] as const;

/**
 * Confetti from the centre of whatever `relative` box holds it. Transform and
 * opacity only, played once; the global reduced-motion guard stops it.
 */
export function CelebrationBurst() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-1/2 z-10"
    >
      {PIECES.map((piece) => (
        <span
          key={`${piece.x}:${piece.y}`}
          className={`absolute animate-confetti rounded-[2px] ${piece.size} ${piece.tone}`}
          style={
            {
              "--dx": `${piece.x}px`,
              "--dy": `${piece.y}px`,
              "--spin": `${piece.spin}deg`,
              animationDelay: `${piece.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
