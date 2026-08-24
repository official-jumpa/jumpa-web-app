"use client";

/**
 * Whether the user has moved between screens since the document loaded, so a
 * back arrow knows if there is an in-app entry to step back to. `history.length`
 * cannot answer this — it counts entries from before the app was opened.
 */
let entry: string | null = null;
let moved = false;

/** Called once per screen by AppColumn. Repeats of the same path are ignored. */
export function recordVisit(pathname: string): void {
  if (entry === null) {
    entry = pathname;
    return;
  }
  if (pathname !== entry) moved = true;
}

export function hasInAppHistory(): boolean {
  return moved;
}
