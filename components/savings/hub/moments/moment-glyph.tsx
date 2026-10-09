import { GLYPHS, type GlyphName } from "@/lib/moment-glyphs";

/** A moments glyph on screen — the same path data the share card draws. */
export function MomentGlyph({
  name,
  className,
}: {
  name: GlyphName;
  className?: string;
}) {
  const { stroke, fill } = GLYPHS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {fill ? <path d={fill} fill="currentColor" opacity="0.14" /> : null}
      <path
        d={stroke}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
