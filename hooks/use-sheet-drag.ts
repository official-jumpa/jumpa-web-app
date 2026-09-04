"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
} from "react";

/** Release past this — or flick faster than this — and the sheet closes. */
const DISMISS_PX = 96;
const FLICK_PX_PER_MS = 0.5;
/** Movement before a press counts as a drag rather than a tap. */
const SLOP_PX = 6;
/** How far an upward pull travels, so the sheet resists lifting off its edge. */
const RUBBER = 0.15;
const SETTLE_MS = 220;
const LEAVE_MS = 180;

type Sample = { y: number; t: number };

type Gesture = {
  y: number;
  dy: number;
  /** The last two move samples — a flick is judged on those, since the pointer
   *  does not move on release and would otherwise always read as still. */
  last: Sample;
  prev: Sample;
  /** A grab on the handle drags whatever the content is doing. */
  fromHandle: boolean;
  active: boolean;
};

/**
 * Drag-to-dismiss for a bottom sheet. The handle always drags; the panel itself
 * only when its content is already scrolled to the top, so a long sheet still
 * scrolls. Tap-out and Escape are unaffected.
 */
export function useSheetDrag(onClose: () => void) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLButtonElement | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const leaving = useRef(false);
  const draggedAt = useRef(0);

  const paint = useCallback((dy: number, ms: number) => {
    const panel = panelRef.current;
    if (!panel) return;

    // The entry keyframes animate transform and opacity with a forwards fill,
    // so they have to be dropped before an inline value means anything.
    panel.style.animation = "none";
    panel.style.transition = ms
      ? `transform ${ms}ms var(--ease-jumpa)`
      : "none";
    panel.style.transform = `translateY(${dy}px)`;

    const scrim = scrimRef.current;
    if (!scrim) return;
    scrim.style.animation = "none";
    scrim.style.transition = ms ? `opacity ${ms}ms var(--ease-jumpa)` : "none";
    scrim.style.opacity = String(
      Math.max(0, 1 - Math.max(0, dy) / (panel.offsetHeight || 1)),
    );
  }, []);

  const begin = useCallback(
    (event: ReactPointerEvent<HTMLElement>, fromHandle: boolean) => {
      const panel = panelRef.current;
      // A second pointer, or the handle having already claimed this one.
      if (leaving.current || gesture.current || !panel) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (!fromHandle && panel.scrollTop > 0) return;

      const sample = { y: event.clientY, t: event.timeStamp };
      gesture.current = {
        y: event.clientY,
        dy: 0,
        last: sample,
        prev: sample,
        fromHandle,
        active: false,
      };
    },
    [],
  );

  const move = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = gesture.current;
      const panel = panelRef.current;
      if (!drag || !panel) return;

      const dy = event.clientY - drag.y;

      if (!drag.active) {
        if (Math.abs(dy) < SLOP_PX) return;
        // Pulling up on the body is a scroll; only the handle reads it as a drag.
        if (dy < 0 && !drag.fromHandle) {
          gesture.current = null;
          return;
        }
        drag.active = true;
        panel.setPointerCapture(event.pointerId);
      }

      drag.prev = drag.last;
      drag.last = { y: event.clientY, t: event.timeStamp };
      drag.dy = dy > 0 ? dy : dy * RUBBER;
      paint(drag.dy, 0);
    },
    [paint],
  );

  const end = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = gesture.current;
      const panel = panelRef.current;
      gesture.current = null;
      if (!drag?.active || !panel) return;

      panel.releasePointerCapture(event.pointerId);
      draggedAt.current = event.timeStamp;

      const dt = Math.max(1, drag.last.t - drag.prev.t);
      const velocity = (drag.last.y - drag.prev.y) / dt;

      if (
        drag.dy > DISMISS_PX ||
        (drag.dy > SLOP_PX && velocity > FLICK_PX_PER_MS)
      ) {
        leaving.current = true;
        paint(panel.offsetHeight, LEAVE_MS);
        window.setTimeout(onClose, LEAVE_MS);
        return;
      }

      paint(0, SETTLE_MS);
    },
    [onClose, paint],
  );

  const cancel = useCallback(() => {
    const drag = gesture.current;
    gesture.current = null;
    if (drag?.active) paint(0, SETTLE_MS);
  }, [paint]);

  /** A drag that ends over a row must not also count as a tap on it. */
  const swallowClick = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (event.timeStamp - draggedAt.current > 300) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    scrimRef,
    panelProps: {
      ref: panelRef,
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) =>
        begin(event, false),
      onPointerMove: move,
      onPointerUp: end,
      onPointerCancel: cancel,
      onClickCapture: swallowClick,
    },
    handleProps: {
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) =>
        begin(event, true),
    },
  };
}
