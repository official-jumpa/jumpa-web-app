"use client";

import { useEffect } from "react";

const VIEWPORT = 'meta[name="viewport"]';

/** iPadOS reports itself as a Mac, so a touch screen is what gives it away. */
function isIos(): boolean {
  const { userAgent, maxTouchPoints } = navigator;
  return (
    /iPhone|iPad|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  );
}

function capScale() {
  for (const meta of document.querySelectorAll<HTMLMetaElement>(VIEWPORT)) {
    if (!meta.content.includes("maximum-scale")) {
      meta.content = `${meta.content}, maximum-scale=1`;
    }
  }
}

/**
 * iOS zooms in on any field set under 16px and stays zoomed after it blurs.
 * A maximum scale stops that, and since iOS 10 it no longer blocks pinch-zoom.
 * Android does treat it as a pinch-zoom lock, so it is applied on iOS only.
 * Renders nothing.
 */
export function IosInputZoom() {
  useEffect(() => {
    if (!isIos()) return;
    capScale();
    // Next can swap the viewport tag in after a navigation has rendered.
    const observer = new MutationObserver(capScale);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["content"],
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
