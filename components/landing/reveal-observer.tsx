"use client";

import { useCallback } from "react";

/**
 * Reveals every `.reveal*` element on the landing page as it scrolls into view.
 * One observer for the whole page; the sections only carry markers, and the
 * animations themselves are in `app/globals.css`.
 *
 * Three rules make this safe to add to a server-rendered marketing page:
 *
 * Nothing is hidden in CSS. This island is the only thing that hides anything,
 * so with JS off — and for a crawler — the page renders exactly as it does at
 * rest, with no reveal ever starting.
 *
 * It hides only what is below the fold. Anything already on screen has been
 * painted at rest since the server's HTML arrived, and replaying it after
 * hydration would read as a flicker; the hero plays its entrance from plain
 * `animate-*` utilities instead, which run from the first paint with no JS at
 * all. The work hangs off a ref callback, which fires before paint, so an
 * element still below the fold is hidden before it can ever be seen.
 *
 * Nothing it hides can stay hidden. An element it never gets an intersection
 * for would be invisible for good, so the two cases that produce one are ruled
 * out up front — a breakpoint's `display: none` (the mobile-only FAQ rows) and
 * a sideways clip (the feature row's third and fourth cards, which the design
 * cuts off) — and the hold below is released outright at the foot of the page.
 */

const TARGETS =
  ".reveal, .reveal-left, .reveal-right, .reveal-zoom, .reveal-bar";

/** Hold the reveal until the element's top edge is a little way onto the screen. */
const ROOT_MARGIN = "0px 0px -12% 0px";

function watch(node: HTMLElement): () => void {
  const doc = node.ownerDocument;
  const view = doc.defaultView;
  if (!view) return () => {};

  const fold = view.innerHeight;
  const waiting = new Set<HTMLElement>();

  function show(el: HTMLElement) {
    waiting.delete(el);
    delete el.dataset.revealWait;
    el.dataset.revealIn = "";
    observer.unobserve(el);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) show(entry.target as HTMLElement);
      }
    },
    { rootMargin: ROOT_MARGIN },
  );

  /**
   * The hold shrinks the viewport's bottom edge, and the last elements on the
   * page can never clear it — there is no scroll left to carry them up. At the
   * foot of the document nothing is below the fold any more, so the rest goes.
   */
  const flush = () => {
    const end = doc.documentElement.scrollHeight - view.innerHeight;
    if (view.scrollY < end - 2) return;
    for (const el of [...waiting]) show(el);
    view.removeEventListener("scroll", flush);
  };

  for (const el of doc.querySelectorAll<HTMLElement>(TARGETS)) {
    if (!el.getClientRects().length) continue;
    const box = el.getBoundingClientRect();
    if (box.top < fold) continue;
    // Clipped sideways by a horizontal scroller, so it never intersects. The
    // design cuts the feature row off after the first card and a half.
    if (box.right <= 0 || box.left >= view.innerWidth) continue;
    el.dataset.revealWait = "";
    waiting.add(el);
    observer.observe(el);
  }

  view.addEventListener("scroll", flush, { passive: true });

  return () => {
    observer.disconnect();
    view.removeEventListener("scroll", flush);
  };
}

export function RevealObserver() {
  const attach = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    return watch(node);
  }, []);

  return <span ref={attach} hidden />;
}
