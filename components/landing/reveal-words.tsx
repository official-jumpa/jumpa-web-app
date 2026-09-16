import { Fragment } from "react";
import { revealStep } from "@/components/landing/reveal";

/**
 * Splits a line into words that arrive one after another — the same sweep a
 * Jumpa reply uses in the chat, so the page introduces itself the way the
 * product answers.
 *
 * `start` continues the count past a run, so a heading broken by a gradient
 * span still reads as one sentence. **That span has to stay whole:**
 * `background-clip: text` does not paint through a child carrying its own
 * opacity, so a gradient phrase is one word here, never several.
 *
 * The space sits between the spans rather than inside them. An inline-block is
 * atomic, so a trailing space kept inside one would leave the line with no
 * break opportunity and the heading would stop wrapping.
 */
export function RevealWords({
  text,
  start = 0,
}: {
  text: string;
  start?: number;
}) {
  const words = text.trim().split(/\s+/);

  return (
    <>
      {words.map((word, index) => (
        <Fragment key={`${start + index}-${word}`}>
          <span
            style={revealStep(start + index)}
            className="stagger inline-block animate-word"
          >
            {word}
          </span>{" "}
        </Fragment>
      ))}
    </>
  );
}
