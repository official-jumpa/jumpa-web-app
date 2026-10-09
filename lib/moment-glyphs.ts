/**
 * The savings moments' glyphs as path data, in the icon set's 24 viewBox and
 * two-layer idiom (a 0.14 fill under a 2px stroke). Data rather than
 * components so the share card's canvas and the screen draw the same marks.
 */

export type GlyphName =
  | "flame"
  | "flag"
  | "users"
  | "trophy"
  | "party"
  | "medal"
  | "sparkle"
  | "check";

export type Glyph = {
  stroke: string;
  /** The tinted layer under the stroke. */
  fill?: string;
};

export const GLYPHS: Record<GlyphName, Glyph> = {
  flame: {
    stroke:
      "M12 22c-4 0-7-2.8-7-6.6 0-2.6 1.5-4.6 3-6.1.3 1.6 1.2 2.6 2.4 3.1C10 9 11 5.6 13.6 2.5c.6 3 2.2 4.6 3.8 6.4C18.8 10.5 19 12.6 19 15.4 19 19.2 16 22 12 22Z",
    fill: "M12 22c-4 0-7-2.8-7-6.6 0-2.6 1.5-4.6 3-6.1.3 1.6 1.2 2.6 2.4 3.1C10 9 11 5.6 13.6 2.5c.6 3 2.2 4.6 3.8 6.4C18.8 10.5 19 12.6 19 15.4 19 19.2 16 22 12 22Z",
  },
  flag: {
    stroke: "M5 21V4m0 0h11l-2 4 2 4H5",
    fill: "M5 4h11l-2 4 2 4H5Z",
  },
  users: {
    stroke:
      "M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 20v-1.5a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8",
    fill: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  },
  trophy: {
    stroke:
      "M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4.5A3.5 3.5 0 0 0 8 8.5M16 5h3.5A3.5 3.5 0 0 1 16 8.5M12 13v8M8 21h8",
    fill: "M8 3h8v6a4 4 0 0 1-8 0V3Z",
  },
  party: {
    stroke:
      "M4 20 8.5 7.5l8 8L4 20ZM13 7.5c1-1.5 2.4-2.3 4-2.5M16.5 11c1.5-1 2.3-2.4 2.5-4M12 3v1M21 12h-1M19.5 4.5l-.7.7",
    fill: "M4 20 8.5 7.5l8 8L4 20Z",
  },
  medal: {
    stroke:
      "M7 2l3.5 7.5M17 2l-3.5 7.5M12 22a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM11 15l1-1v4",
    fill: "M12 22a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z",
  },
  sparkle: {
    stroke:
      "M11 5l1.9 5.1L18 12l-5.1 1.9L11 19l-1.9-5.1L4 12l5.1-1.9L11 5ZM19 3v4M17 5h4",
    fill: "M11 5l1.9 5.1L18 12l-5.1 1.9L11 19l-1.9-5.1L4 12l5.1-1.9L11 5Z",
  },
  check: { stroke: "M20 6 9 17l-5-5" },
};
