"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observeFit } from "./board-fit";
import { CarouselProgressContext } from "./carousel-progress";
import { ONBOARDING_SLIDES } from "./slides";
import { ChatSlide } from "./slides/chat-slide";
import { CoinsSlide } from "./slides/coins-slide";
import { HeroSlide } from "./slides/hero-slide";

const AUTO_ADVANCE_MS = 3600;
const RESUME_AFTER_INPUT_MS = 8000;
/** Quiet time after the last scroll event before the position counts as settled. */
const SETTLE_MS = 140;

/** How far a gesture has to carry the board before it counts as a step. */
const COMMIT = 0.08;

const COUNT = ONBOARDING_SLIDES.length;
/** The track is three empty screens and always rests on the middle one, so a
 *  swipe always has somewhere to go and the carousel never reaches an end. */
const TRACK = ["back", "home", "forward"];
const HOME = 1;

/**
 * The three screens are stacked and dissolve into one another, so a handover is
 * never two backgrounds meeting at a seam. The scroller is still the browser's —
 * it just moves an empty track under them, which is what keeps the swipe, the
 * momentum and the snap native.
 */
export function OnboardingCarousel() {
  const scroller = useRef<HTMLDivElement>(null);
  const heldUntil = useRef(0);
  /** Which screen is showing. Only ever whole steps, so the browser tweens it. */
  const [index, setIndex] = useState(0);
  /** How far the finger has carried the board off that screen, otherwise null. */
  const [shift, setShift] = useState<number | null>(null);

  // A ref callback rather than an effect: it runs before paint and never on the
  // server, so a soft nav in from the splash lands already scaled.
  const attach = useCallback((el: HTMLDivElement | null) => {
    scroller.current = el;
    if (!el) return;

    // Onboarding always opens on the first slide, parked on the middle screen of
    // the track. Browsers restore a scroll container's position across a reload,
    // and restoration lands after this callback, so it repeats for two frames.
    const park = () => {
      el.scrollLeft = el.clientWidth * HOME;
    };
    park();
    let left = 2;
    let raf = requestAnimationFrame(function reset() {
      park();
      left -= 1;
      if (left > 0) raf = requestAnimationFrame(reset);
    });

    const stopObserving = observeFit(el);
    return () => {
      cancelAnimationFrame(raf);
      stopObserving();
    };
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    let settle = 0;
    /** Which screen the gesture in flight started from, null when none is. */
    let from: number | null = null;
    /** The furthest that gesture has carried the board, signed. */
    let peak = 0;
    /** A finger is still on the glass. */
    let down = false;

    const arm = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(end, SETTLE_MS);
    };

    const commit = () => {
      const width = el.clientWidth;
      if (!width) return;
      const travelled = from === null ? 0 : el.scrollLeft / width - from;
      // Take what snap chose, or — when a short, quick flick springs back —
      // what the finger plainly meant. Without that a real swipe can land on
      // nothing and has to be made twice.
      let step = Math.round(travelled);
      if (!step && Math.abs(peak) >= COMMIT) step = Math.sign(peak);
      if (step) setIndex((i) => (((i + step) % COUNT) + COUNT) % COUNT);
      // Slide the track back under the board. Nothing is pinned to the scroll
      // position, so the jump cannot be seen, and the next swipe has room in
      // both directions. A scroll nobody asked for only re-parks.
      from = null;
      peak = 0;
      window.clearTimeout(settle);
      el.scrollLeft = width * HOME;
      setShift(null);
    };

    // A finger still on the glass is not a finished gesture. Touch tells us
    // that directly; the pointer events cannot, because the browser fires
    // `pointercancel` the moment the scroller takes the touch over. Resting
    // between two whole steps is the fallback for inputs with no release of
    // their own, since snap always lands on one.
    const end = () => {
      const width = el.clientWidth;
      if (!width) return;
      const at = el.scrollLeft / width;
      if (from !== null && (down || Math.abs(at - Math.round(at)) > 0.01)) {
        arm();
        return;
      }
      commit();
    };

    const hold = () => {
      heldUntil.current = Date.now() + RESUME_AFTER_INPUT_MS;
      const width = el.clientWidth;
      if (from === null && width) {
        from = Math.round(el.scrollLeft / width);
        peak = 0;
      }
      arm();
    };

    const press = () => {
      down = true;
      hold();
    };

    // Committing on release rather than waiting for the snap animation and
    // then the settle timer is what makes a swipe answer straight away.
    const lift = () => {
      down = false;
      heldUntil.current = Date.now() + RESUME_AFTER_INPUT_MS;
      if (from !== null) commit();
    };

    // Scroll events are already frame-aligned, so this tracks the finger with
    // no rAF of its own. Everything downstream is opacity and transform.
    const onScroll = () => {
      const width = el.clientWidth;
      if (from !== null && width) {
        const shift = el.scrollLeft / width - from;
        if (Math.abs(shift) > Math.abs(peak)) peak = shift;
        setShift(shift);
      }
      arm();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", hold);
    el.addEventListener("pointerup", lift);
    el.addEventListener("touchstart", press, { passive: true });
    el.addEventListener("touchend", lift, { passive: true });
    el.addEventListener("touchcancel", lift, { passive: true });
    el.addEventListener("wheel", hold, { passive: true });

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // The handover is a CSS transition and the track never moves for it, so an
    // auto-advance is one state change. Nothing of ours runs while a screen
    // changes, which is what keeps it smooth on a slow phone.
    const timer = reduced
      ? 0
      : window.setInterval(() => {
          if (from !== null || Date.now() < heldUntil.current) return;
          setIndex((i) => (i + 1) % COUNT);
        }, AUTO_ADVANCE_MS);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(settle);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", hold);
      el.removeEventListener("pointerup", lift);
      el.removeEventListener("touchstart", press);
      el.removeEventListener("touchend", lift);
      el.removeEventListener("touchcancel", lift);
      el.removeEventListener("wheel", hold);
    };
  }, []);

  const progress = useMemo(
    () => ({ position: index + (shift ?? 0), animated: shift === null }),
    [index, shift],
  );

  return (
    <div
      ref={attach}
      className="mx-auto flex h-dvh max-w-app snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* Pinned over the track. The negative margin means it takes none of the
          scroller's width, and because it is still a child of the scroller a
          touch anywhere on it — the CTAs included — drags the carousel. The
          base colour is what a mid-dissolve blends against, never the page. */}
      <div className="sticky left-0 z-10 -mr-[100%] h-dvh w-full shrink-0 overflow-hidden bg-jumpa-primary-600">
        <CarouselProgressContext.Provider value={progress}>
          <ChatSlide index={0} />
          <CoinsSlide index={1} />
          <HeroSlide index={2} />
        </CarouselProgressContext.Provider>
      </div>

      {/* Empty snap targets: all the scroller ever moves. */}
      {TRACK.map((slot) => (
        <div
          key={slot}
          aria-hidden
          className="h-dvh w-full shrink-0 snap-center"
        />
      ))}
    </div>
  );
}
