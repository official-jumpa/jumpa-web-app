import { Fragment } from "react";
import { revealStep } from "@/components/landing/reveal";

/**
 * Splits a line into characters that flip up into place one after another, the
 * way a split-flap board settles. The hero's own entrance — it plays once, at
 * the first paint, from plain CSS with no JS.
 *
 * Words stay whole: each is an atomic `inline-block` and the space sits between
 * them, so the line still breaks exactly where it did. The characters inside a
 * word are `inline-block` too, because a transform does not apply to a plain
 * inline box.
 *
 * The split is decorative — the caller renders the real sentence for a screen
 * reader, which would otherwise read the heading letter by letter.
 */
export function HeadlineChars({
  text,
  start = 0,
}: {
  text: string;
  start?: number;
}) {
  let index = start;

  return (
    <>
      {text
        .trim()
        .split(/\s+/)
        .map((word) => {
          const chars = [...word];
          const at = index;
          index += chars.length;

          return (
            <Fragment key={`${at}-${word}`}>
              <span className="inline-block whitespace-nowrap">
                {chars.map((char, offset) => (
                  <span
                    key={`${at + offset}-${char}`}
                    style={revealStep(at + offset)}
                    className="flip-char inline-block"
                  >
                    {char}
                  </span>
                ))}
              </span>{" "}
            </Fragment>
          );
        })}
    </>
  );
}

/** Where a line's characters stop, so the phrase after it carries on in step. */
export function countChars(text: string): number {
  return [...text.replace(/\s+/g, "")].length;
}
