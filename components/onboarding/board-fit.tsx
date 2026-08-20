/**
 * Publishes the onboarding board's scale to CSS as `--fit` / `--squeeze` / `--vh`.
 *
 * This deliberately is not CSS. The scale is one length divided by another, which
 * `calc()` has no operator for; the usual `tan(atan2(a,b))` workaround resolves to
 * garbage in Safari, which returns the angle in degrees and reads it back as radians.
 */
function applyFit(el: HTMLElement) {
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (!w || !h) return;
  // Gaps tighten first, between 777px and 688px of viewport; then the board scales.
  const squeeze = Math.min(1, Math.max(0, (777 - h) / 89));
  // Only the 787px band between the status bar and the buttons has to fit — the
  // browser draws that chrome itself. Never wider than the column it sits in.
  const fit = Math.min(w / 393, h / (787 - 84 * squeeze));
  el.style.setProperty("--squeeze", `${squeeze}`);
  el.style.setProperty("--fit", `${fit}`);
  el.style.setProperty("--vh", `${h}px`);
}

/** Tracks the column's box. Returns a disposer, so it can hang off a ref callback. */
export function observeFit(el: HTMLElement) {
  applyFit(el);
  const observer = new ResizeObserver(() => applyFit(el));
  observer.observe(el);
  return () => observer.disconnect();
}
