import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const PROMO_ART = "/images/promo";

/** The 182×257 artboard. It scales as one piece, so sizes inside read as design px. */
export function PromoArtboard({
  background,
  children,
}: {
  background: string;
  children: ReactNode;
}) {
  return (
    <div className="frame-182 w-full">
      <div
        className={cn(
          "relative isolate h-257 w-182 overflow-hidden rounded-u-20",
          background,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** The pill every pop-up ends on; following it closes the pop-up. */
export function PromoCta({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="tap absolute top-210 left-40 flex h-29 w-106 items-center justify-center rounded-pill bg-jumpa-primary-600 text-u-10.75/10 font-semibold tracking-jumpa-snug whitespace-nowrap text-jumpa-alt-400 active:scale-[0.97]"
    >
      {children}
    </Link>
  );
}

/** The soft purple glow; position and size come from `className`. */
export function PromoGlow({ className }: { className: string }) {
  return (
    <Image
      src={`${PROMO_ART}/savings-popup-glow.svg`}
      alt=""
      width={40}
      height={40}
      className={cn("pointer-events-none absolute", className)}
    />
  );
}

/** The confetti cluster; position, size and turn come from `className`. */
export function PromoShapes({ className }: { className: string }) {
  return (
    <Image
      src={`${PROMO_ART}/savings-popup-shapes.svg`}
      alt=""
      width={107}
      height={99}
      className={cn("pointer-events-none absolute max-w-none", className)}
    />
  );
}

/** The haze behind the referral pop-ups' artwork: a faint disc and two blurred patches. */
export function PromoHaze() {
  return (
    <>
      <span className="pointer-events-none absolute top-93 left-79 h-110 w-109 bg-jumpa-primary-30 blur-u-10" />
      <span className="pointer-events-none absolute top-55.75 -left-63.25 size-118.5 rounded-full bg-jumpa-primary-600/6" />
      <span className="pointer-events-none absolute top-85.25 -left-22.5 h-110 w-109 bg-jumpa-primary-30 blur-u-10" />
    </>
  );
}
