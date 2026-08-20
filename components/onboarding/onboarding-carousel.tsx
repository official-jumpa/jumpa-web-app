"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BoardFitScript, observeFit } from "./board-fit";
import { CarouselProgressContext } from "./carousel-progress";
import { ONBOARDING_SLIDES } from "./slides";
import { ChatSlide } from "./slides/chat-slide";
import { CoinsSlide } from "./slides/coins-slide";
import { HeroSlide } from "./slides/hero-slide";

const AUTO_ADVANCE_MS = 5000;
const RESUME_AFTER_INPUT_MS = 8000;

export function OnboardingCarousel() {
  const scroller = useRef<HTMLDivElement>(null);
  const heldUntil = useRef(0);
  const [progress, setProgress] = useState(0);

  // A ref callback rather than an effect: it runs before paint and never on the
  // server, so a soft nav in from the splash lands already scaled.
  const attach = useCallback((el: HTMLDivElement | null) => {
    scroller.current = el;
    return el ? observeFit(el) : undefined;
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

    const hold = () => {
      heldUntil.current = Date.now() + RESUME_AFTER_INPUT_MS;
    };

    const timer = window.setInterval(() => {
      if (Date.now() < heldUntil.current) return;
      const width = el.clientWidth;
      if (!width) return;
      const next =
        (Math.round(el.scrollLeft / width) + 1) % ONBOARDING_SLIDES.length;
      el.scrollTo({ left: next * width, behavior: "smooth" });
    }, AUTO_ADVANCE_MS);

    el.addEventListener("pointerdown", hold);
    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("wheel", hold, { passive: true });

    return () => {
      window.clearInterval(timer);
      el.removeEventListener("pointerdown", hold);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("wheel", hold);
    };
  }, []);

  return (
    <div
      ref={attach}
      // BoardFitScript writes the measurements onto this element's style before
      // React hydrates, which is a mismatch by definition.
      suppressHydrationWarning
      className="mx-auto flex h-dvh max-w-[430px] snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <BoardFitScript />
      <CarouselProgressContext.Provider value={progress}>
        <ChatSlide />
        <CoinsSlide />
        <HeroSlide />
      </CarouselProgressContext.Provider>
    </div>
  );
}
