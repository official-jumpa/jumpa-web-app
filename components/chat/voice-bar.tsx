"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import { CircleStopIcon } from "@/components/ui/icons/circle-stop";
import { XmarkIcon } from "@/components/ui/icons/xmark";

/** Bar heights straight from the design, left to right. */
const BARS = [
  8, 8, 24, 15, 29, 25, 20, 12, 26, 10, 24, 8, 8, 22, 12, 24, 12, 22, 15, 15,
  29, 8, 8,
];

const PILL = "flex min-w-0 flex-1 items-center rounded-surface";

/** How many lines of transcript to show before it starts scrolling. */
const MAX_LINES = 3;

/** Recording, with animated wave bars, duration timer, and cancel button. */
export function VoiceWave({
  duration = 0,
  onCancel,
}: {
  duration?: number;
  onCancel?: () => void;
}) {
  const m = Math.floor(duration / 60);
  const s = duration % 60;
  const timeStr = `${m}:${s < 10 ? "0" : ""}${s}`;

  return (
    <div
      className={`${PILL} h-11.5 justify-between gap-2 bg-jumpa-primary-600 px-3.5 text-jumpa-white`}
    >
      <div className="flex items-center gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel recording"
            title="Cancel recording"
            className="tap shrink-0 text-white/80 hover:text-white active:scale-90 transition-transform cursor-pointer"
          >
            <XmarkIcon className="size-5" />
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs font-semibold tabular-nums tracking-wide">
            {timeStr}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-hidden">
        {BARS.map((height, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: the bars are a fixed decorative pattern
            key={index}
            style={{ height: Math.min(24, Math.max(6, height * 0.75)), "--i": index } as CSSProperties}
            className="w-1 shrink-0 animate-wave stagger-bar rounded-full bg-jumpa-alt-400"
          />
        ))}
      </div>
    </div>
  );
}

/** Recording, with the transcript so far — discard it, or stop and keep it. */
export function VoiceTranscript({
  text,
  onDiscard,
  onStop,
}: {
  text: string;
  onDiscard: () => void;
  onStop: () => void;
}) {
  const box = useRef<HTMLParagraphElement>(null);

  // Follow the words down. The newest speech is what matters while dictating,
  // so the box scrolls rather than clamping to the opening line.
  // biome-ignore lint/correctness/useExhaustiveDependencies: text is the trigger, the body never reads it
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text]);

  return (
    <div
      className={`${PILL} min-h-11.5 gap-3.75 bg-jumpa-white py-2.75 pr-2.75 pl-3.5`}
    >
      <button
        type="button"
        onClick={onDiscard}
        aria-label="Discard recording"
        className="tap shrink-0 text-jumpa-neutral-600 active:scale-90"
      >
        <XmarkIcon className="size-6" />
      </button>

      <p
        ref={box}
        style={{ maxHeight: `${MAX_LINES * 1.25}rem` }}
        className="min-w-0 flex-1 overflow-y-auto text-[13px] leading-5 font-medium break-words text-jumpa-black [scrollbar-width:none]"
      >
        {text}
      </p>

      <button
        type="button"
        onClick={onStop}
        aria-label="Stop recording"
        className="tap shrink-0 text-jumpa-primary-600 active:scale-90"
      >
        <CircleStopIcon className="size-6" />
      </button>
    </div>
  );
}
