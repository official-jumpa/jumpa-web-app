/**
 * Lazy images in a transform-animated track are never re-checked as it moves,
 * so they can scroll into view blank. Copies share a URL and download once.
 */
export const MARQUEE_IMAGE = {
  loading: "eager",
  fetchPriority: "low",
} as const;
