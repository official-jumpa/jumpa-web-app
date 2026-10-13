/**
 * For images that move into view without the page scrolling: marquee tracks
 * and carousel slides parked off to the side. A lazy image there is only
 * fetched once it slides in, so it arrives blank. Low priority keeps them
 * behind the hero; marquee copies share a URL and download once.
 */
export const SLIDE_IMAGE = {
  loading: "eager",
  fetchPriority: "low",
} as const;
