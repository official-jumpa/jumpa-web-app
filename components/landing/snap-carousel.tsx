"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const TRACK =
  "relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/**
 * A native scroll-snap row with live dots. Slides are passed in as children so
 * they stay server-rendered; each one should carry `snap-start shrink-0`.
 */
export function SnapCarousel({
  label,
  count,
  className,
  trackClassName,
  children,
}: {
  label: string;
  count: number;
  className?: string;
  /** Gutter, gap and scroll padding for the row. */
  trackClassName?: string;
  children: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const slides = Array.from(el.children) as HTMLElement[];
      // The last slide may not reach its snap point, so the end of the row wins.
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
        setActive(slides.length - 1);
        return;
      }
      const origin = el.scrollLeft + slides[0].offsetLeft;
      let closest = 0;
      slides.forEach((slide, i) => {
        if (
          Math.abs(slide.offsetLeft - origin) <
          Math.abs(slides[closest].offsetLeft - origin)
        ) {
          closest = i;
        }
      });
      setActive(closest);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const show = (index: number) => {
    const el = track.current;
    const slides = el ? (Array.from(el.children) as HTMLElement[]) : [];
    if (!el || !slides[index]) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollTo({
      left: slides[index].offsetLeft - slides[0].offsetLeft,
      behavior: reduce ? "auto" : "smooth",
    });
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <section
        ref={track}
        aria-label={label}
        className={cn(TRACK, trackClassName)}
      >
        {children}
      </section>
      <div className="mx-auto mt-20 flex h-16 items-center gap-2 rounded-full border-u-1 border-jumpa-primary-100 bg-jumpa-primary-50 px-3">
        {Array.from({ length: count }, (_, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: one dot per slide, in order.
            key={i}
            type="button"
            aria-label={`Show ${i + 1} of ${count}`}
            aria-current={i === active}
            onClick={() => show(i)}
            className={cn(
              "h-8 w-17 rounded-full transition-colors duration-300",
              i === active ? "bg-jumpa-primary-600" : "bg-jumpa-primary-100",
            )}
          />
        ))}
      </div>
    </div>
  );
}
