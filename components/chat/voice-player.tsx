"use client";

import { useState } from "react";
import { VoiceWaveform } from "@/components/chat/voice-waveform";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { PauseIcon } from "@/components/ui/icons/pause";
import { PlayIcon } from "@/components/ui/icons/play";
import { useVoiceAudio } from "@/hooks/use-voice-audio";

interface VoicePlayerProps {
  url: string;
  name?: string;
  align?: "user" | "agent";
  transcript?: string;
}

/**
 * A voice note as it sits in the transcript. It takes the same ground and radius
 * as a prose bubble — a voice note is a message, not a file — and draws the same
 * waveform the composer showed while it was being recorded.
 */
export function VoicePlayer({
  url,
  name = "voice note",
  align = "user",
  transcript,
}: VoicePlayerProps) {
  const audio = useVoiceAudio();
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <div
      className={`flex w-full flex-col ${align === "user" ? "items-end" : "items-start"}`}
    >
      <div className="w-full overflow-hidden rounded-dock bg-jumpa-neutral-95">
        <div className="flex items-center gap-2.5 p-2.5">
          {/* biome-ignore lint/a11y/useMediaCaption: a voice note is the caption's own source */}
          <audio ref={audio.audioRef} src={url} preload="metadata" />

          <button
            type="button"
            onClick={audio.toggle}
            aria-label={audio.isPlaying ? `Pause ${name}` : `Play ${name}`}
            className="tap flex size-10 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-white active:scale-95"
          >
            {audio.isPlaying ? (
              <PauseIcon className="size-4.5" />
            ) : (
              <PlayIcon className="ml-0.5 size-4.5" />
            )}
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="relative">
              <VoiceWaveform progress={audio.progress} />
              {/* A real range input over the bars, so the wave can be scrubbed
                  with a keyboard and announces itself. */}
              <input
                type="range"
                min={0}
                max={audio.length}
                step={0.1}
                value={audio.currentTime}
                onChange={audio.seek}
                aria-label={`Seek ${name}`}
                className="absolute inset-0 w-full cursor-pointer opacity-0"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] leading-3 font-medium tabular-nums text-jumpa-neutral-425">
                {audio.elapsed} / {audio.total}
              </span>
              <button
                type="button"
                onClick={audio.cycleSpeed}
                aria-label="Change playback speed"
                className="tap rounded-pill bg-jumpa-white px-2 py-0.5 text-[10px] leading-3 font-semibold text-jumpa-primary-600 active:scale-95"
              >
                {audio.speed}x
              </button>
            </div>
          </div>
        </div>

        {transcript ? (
          <>
            <div className="mx-2.5 h-px bg-jumpa-neutral-90" />
            <button
              type="button"
              onClick={() => setShowTranscript((open) => !open)}
              aria-expanded={showTranscript}
              className="tap flex w-full items-center justify-between gap-2 px-4 py-2.5 text-[11px] leading-3.5 font-medium text-jumpa-neutral-450"
            >
              {showTranscript ? "Hide transcript" : "View transcript"}
              <ChevronDownIcon
                className={`size-4 transition-transform ${showTranscript ? "rotate-180" : ""}`}
              />
            </button>
            {/* Always mounted and animated on grid rows, so it opens and closes
                on the same curve instead of snapping in and out of flow. */}
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-jumpa ${showTranscript ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <p className="overflow-hidden px-4 text-[13px] leading-5 break-words text-jumpa-neutral-700 select-text">
                <span className="block pb-3.5">{transcript}</span>
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
