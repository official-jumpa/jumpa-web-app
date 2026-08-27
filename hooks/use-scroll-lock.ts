import { useEffect } from "react";

/** Freezes the page behind an overlay. Pads for the scrollbar so nothing shifts. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const { body, documentElement: html } = document;
    const gap = window.innerWidth - html.clientWidth;
    const previous = {
      html: html.style.overflow,
      body: body.style.overflow,
      padding: body.style.paddingRight,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    return () => {
      html.style.overflow = previous.html;
      body.style.overflow = previous.body;
      body.style.paddingRight = previous.padding;
    };
  }, [locked]);
}
