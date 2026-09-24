"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RefreshIcon } from "@/components/ui/icons/refresh";
import { broadcastRefresh } from "@/lib/refresh";

/** Finger travel that arms the refresh, before resistance. */
const THRESHOLD = 68;
/** How far the disc travels however hard you pull. */
const MAX = 96;
/** Under this the gesture is still a tap or a sideways swipe. */
const SLOP = 8;
/** The pull is damped so the disc lags the finger, as every native one does. */
const RESISTANCE = 0.55;
/** Where the disc sits while it spins. */
const REST = 58;
/** A refresh that resolves instantly still has to read as one. */
const SPIN_MS = 700;
/** The disc is parked this far above the top edge at rest. */
const PARKED = 44;

/**
 * In-app pull-to-refresh.
 *
 * The browser's own gesture is off (`overscroll-behavior-y: none` in
 * `globals.css`) because iOS has no pull-to-refresh at all — it rubber-bands the
 * document instead and exposes the canvas behind it, which is the black band
 * testers reported. This draws the same gesture on both platforms.
 *
 * Nothing here transforms the column. A transform on an ancestor becomes the
 * containing block for every `fixed` overlay under it — nav, sheets, backdrops —
 * so the content stays put and only the disc descends, which is also what
 * Chrome's own gesture does on Android.
 *
 * The drag writes straight to the DOM. Re-rendering on every touchmove is the
 * one thing that would make this stutter on a cheap phone.
 */
export function PullToRefresh() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const disc = useRef<HTMLSpanElement>(null);
  const icon = useRef<SVGSVGElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const active = useRef(false);
  const pull = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    const paint = (distance: number, animate: boolean) => {
      pull.current = distance;
      const box = disc.current;
      const glyph = icon.current;
      if (!box) return;
      box.style.transition = animate
        ? "transform 280ms var(--ease-jumpa), opacity 280ms var(--ease-jumpa)"
        : "none";
      box.style.transform = `translateY(${distance - PARKED}px)`;
      box.style.opacity = String(Math.min(distance / 26, 1));
      if (glyph && !busy.current) {
        glyph.style.transform = `rotate(${distance * 4}deg)`;
        glyph.style.opacity = distance >= THRESHOLD * RESISTANCE ? "1" : "0.5";
      }
    };

    // A sheet freezes the page behind it; the page is not what the finger is on.
    const locked = () => document.body.style.overflow === "hidden";

    // Bail inside a scroller that still has room above — the chat transcript, a
    // plan list — so the pull belongs to it, not to the page.
    const insideScrolledPane = (node: EventTarget | null) => {
      let el = node instanceof Element ? node : null;
      while (el && el !== document.body) {
        if (el.scrollTop > 0) {
          const overflow = getComputedStyle(el).overflowY;
          if (overflow === "auto" || overflow === "scroll") return true;
        }
        el = el.parentElement;
      }
      return false;
    };

    const onStart = (e: TouchEvent) => {
      if (
        busy.current ||
        e.touches.length !== 1 ||
        window.scrollY > 0 ||
        locked() ||
        insideScrolledPane(e.target)
      ) {
        start.current = null;
        return;
      }
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      active.current = false;
    };

    const release = () => {
      start.current = null;
      active.current = false;
    };

    const onMove = (e: TouchEvent) => {
      if (!start.current || busy.current) return;

      const dy = e.touches[0].clientY - start.current.y;
      const dx = e.touches[0].clientX - start.current.x;

      if (!active.current) {
        // Commit to one axis. A sideways swipe — the asset rail, the ad banner —
        // must never arm this.
        if (Math.abs(dx) > Math.abs(dy) || dy < SLOP) {
          if (Math.abs(dx) > SLOP || dy < -SLOP) release();
          return;
        }
        active.current = true;
      }

      // Scrolled back up under the finger: hand the gesture back.
      if (dy <= 0 || window.scrollY > 0) {
        release();
        paint(0, true);
        return;
      }

      if (e.cancelable) e.preventDefault();
      paint(Math.min(dy * RESISTANCE, MAX), false);
    };

    const onEnd = () => {
      if (!active.current) {
        release();
        return;
      }
      const armed = pull.current >= THRESHOLD * RESISTANCE;
      release();

      if (!armed) {
        paint(0, true);
        return;
      }

      busy.current = true;
      setRefreshing(true);
      // Drop the drag's rotation so `animate-spin` starts from upright.
      if (icon.current) icon.current.style.transform = "";
      paint(REST, true);

      // `router.refresh()` reports nothing back, so the spinner runs for a fixed
      // beat rather than pretending to track it.
      broadcastRefresh();
      router.refresh();
      window.setTimeout(() => {
        busy.current = false;
        setRefreshing(false);
        paint(0, true);
      }, SPIN_MS);
    };

    // `passive: false` on move — the pull has to cancel the browser's own
    // scroll, and a passive listener cannot.
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-100 flex justify-center pt-[env(safe-area-inset-top)]"
    >
      <span
        ref={disc}
        className="flex size-9 items-center justify-center rounded-pill bg-jumpa-white opacity-0 shadow-jumpa-toast ring-1 ring-jumpa-neutral-95"
        style={{ transform: `translateY(${-PARKED}px)` }}
      >
        <RefreshIcon
          ref={icon}
          className={`size-4.5 text-jumpa-primary-600 ${refreshing ? "animate-spin" : ""}`}
        />
      </span>
    </div>
  );
}
