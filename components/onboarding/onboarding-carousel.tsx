"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { observeFit } from "./board-fit";
import { CarouselProgressContext } from "./carousel-progress";
import { ONBOARDING_SLIDES } from "./slides";
import { ChatSlide } from "./slides/chat-slide";
import { CoinsSlide } from "./slides/coins-slide";
import { HeroSlide } from "./slides/hero-slide";

const AUTO_ADVANCE_MS = 3600;
const GLIDE_MS = 900;
const RESUME_AFTER_INPUT_MS = 8000;
/** Quiet time after the last scroll event before the position counts as settled. */
const SETTLE_MS = 140;

const LAST = ONBOARDING_SLIDES.length - 1;
/** Index of the trailing copy of the first slide. */
const CLONE = ONBOARDING_SLIDES.length;

export function OnboardingCarousel() {
  const scroller = useRef<HTMLDivElement>(null);
  const heldUntil = useRef(0);
  const [progress, setProgress] = useState(0);

  // A ref callback rather than an effect: it runs before paint and never on the
  // server, so a soft nav in from the splash lands already scaled.
  const attach = useCallback((el: HTMLDivElement | null) => {
    scroller.current = el;
    if (!el) return;

    // Onboarding always opens on the first slide. Browsers restore a scroll
    // container's position across a reload, which would otherwise drop you on
    // the last slide with the auto-advance already finished. Restoration lands
    // after this callback, so it repeats for the next two frames.
    el.scrollLeft = 0;
    let left = 2;
    let raf = requestAnimationFrame(function reset() {
      el.scrollLeft = 0;
      left -= 1;
      if (left > 0) raf = requestAnimationFrame(reset);
    });

    const stopObserving = observeFit(el);
    return () => {
      cancelAnimationFrame(raf);
      stopObserving();
    };
  }, []);

  // Drives the pagination dots, so they morph with the swipe instead of jumping.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = el.clientWidth;
        if (width) setProgress(el.scrollLeft / width);
      });
    };

    read();
    el.addEventListener("scroll", read, { passive: true });
    return () => {
      el.removeEventListener("scroll", read);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;

    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
      el.style.scrollSnapType = "";
    };

    // The native smooth scroll is a short, flat slide. This eases in and out
    // instead, so a slide leaves and arrives rather than cutting across.
    // Mandatory snap fights a per-frame scrollLeft, so it comes off for the
    // glide and goes back on once we land exactly on a slide.
    const glide = (to: number, width: number, onLand?: () => void) => {
      const from = el.scrollLeft;
      const delta = to - from;
      if (!delta) return;

      const duration = GLIDE_MS * Math.sqrt(Math.abs(delta) / width);
      const started = performance.now();
      el.style.scrollSnapType = "none";

      const step = (now: number) => {
        const t = Math.min(1, (now - started) / duration);
        const eased = t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2;
        el.scrollLeft = from + delta * eased;
        if (t < 1) {
          frame = requestAnimationFrame(step);
          return;
        }
        frame = 0;
        onLand?.();
        el.style.scrollSnapType = "";
      };

      frame = requestAnimationFrame(step);
    };

    /** Hands the scroll position from the clone back to the real first slide. */
    const rewind = () => {
      el.scrollLeft = 0;
    };

    const hold = () => {
      heldUntil.current = Date.now() + RESUME_AFTER_INPUT_MS;
      stop();
    };

    const timer = window.setInterval(() => {
      if (frame || Date.now() < heldUntil.current) return;
      const width = el.clientWidth;
      if (!width) return;
      const current = Math.min(LAST, Math.round(el.scrollLeft / width));
      // Past the last slide it glides on into the clone and lands on the real
      // first one in the same frame. The two are the same pixels, so the seam
      // never shows and the loop only ever travels forward — sweeping back
      // across two slides was the one moment that read as a glitch.
      const next = current + 1;
      glide(next * width, width, next === CLONE ? rewind : undefined);
    }, AUTO_ADVANCE_MS);

    // A swipe can also land on the clone; hop back once the scroll settles, so
    // swiping on from there continues into the second slide.
    let settle = 0;
    const onScroll = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        const width = el.clientWidth;
        if (frame || !width) return;
        if (Math.round(el.scrollLeft / width) >= CLONE) rewind();
      }, SETTLE_MS);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", hold);
    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("wheel", hold, { passive: true });

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(settle);
      stop();
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", hold);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("wheel", hold);
    };
  }, []);

  return (
    <div
      ref={attach}
      className="mx-auto flex h-dvh max-w-app snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <CarouselProgressContext.Provider value={progress}>
        <ChatSlide index={0} />
        <CoinsSlide index={1} />
        <HeroSlide index={2} />
        {/* The loop glides into this and lands on the first slide behind it. */}
        <ChatSlide index={CLONE} clone />
      </CarouselProgressContext.Provider>
    </div>
  );
}
