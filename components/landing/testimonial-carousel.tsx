"use client";

import { Children, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const ADVANCE_MS = 5000;
/** Centre-to-centre distance between neighbouring cards, in design px. */
const PITCH = 289.5;
const SIDE_SCALE = 0.884;

/** Signed distance from the active card, wrapped so neighbours sit either side. */
function offsetOf(index: number, active: number, count: number) {
  let d = (index - active + count) % count;
  if (d > count / 2) d -= count;
  return d;
}

/** Desktop testimonials: the active card centred, its neighbours dimmed either side. */
export function TestimonialCarousel({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const cards = Children.toArray(children);
  const count = cards.length;
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      {
        threshold: 0.4,
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Keyed on `active` so a card always gets its full hold.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `active` is the trigger.
  useEffect(() => {
    if (held || !inView || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(
      () => setActive((i) => (i + 1) % count),
      ADVANCE_MS,
    );
    return () => clearTimeout(timer);
  }, [active, held, inView, count]);

  return (
    <section
      ref={root}
      aria-roledescription="carousel"
      aria-label={label}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className={cn("overflow-clip", className)}
    >
      <div className="grid h-full place-items-center pb-0.75">
        {cards.map((card, i) => {
          const offset = offsetOf(i, active, count);
          const far = Math.abs(offset) > 1;
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: cards keep their order.
              key={i}
              aria-hidden={offset !== 0}
              style={{
                translate: `calc(${offset * PITCH} * var(--spacing)) 0`,
                scale: offset === 0 ? 1 : SIDE_SCALE,
                zIndex: offset === 0 ? 2 : far ? 0 : 1,
              }}
              className={cn(
                "col-start-1 row-start-1 transition-[translate,scale,opacity] duration-700 ease-jumpa",
                offset === 0 ? "opacity-100" : far ? "opacity-0" : "opacity-50",
              )}
            >
              {card}
            </div>
          );
        })}
      </div>
      <div className="absolute top-789 left-1/2 flex -translate-x-1/2 gap-7">
        {cards.map((_, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: one dot per card, in order.
            key={i}
            type="button"
            aria-label={`Show testimonial ${i + 1} of ${count}`}
            aria-current={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "size-13 rounded-full transition-colors duration-300",
              i === active ? "bg-jumpa-primary-400" : "bg-jumpa-neutral-255",
            )}
          />
        ))}
      </div>
    </section>
  );
}
