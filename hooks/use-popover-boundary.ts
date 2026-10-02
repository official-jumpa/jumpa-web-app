import { useEffect, useState } from "react";

/** The one element every screen is rendered inside. */
export const APP_COLUMN_ID = "app-column";

/**
 * The app column, for a popover to collide against. Radix measures overflow
 * against the viewport, which on desktop is far wider than our centred column —
 * so a dropdown opens into the black surround instead of being pulled back in.
 *
 * Empty until mount, which is Radix's own default (the viewport).
 */
export function usePopoverBoundary(): Element[] {
  const [boundary, setBoundary] = useState<Element[]>([]);

  useEffect(() => {
    const column = document.getElementById(APP_COLUMN_ID);
    if (column) setBoundary([column]);
  }, []);

  return boundary;
}
