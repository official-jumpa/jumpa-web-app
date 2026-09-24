"use client";

import { VoiceWaveform } from "@/components/chat/voice-waveform";
import { PauseIcon } from "@/components/ui/icons/pause";
import { PlayIcon } from "@/components/ui/icons/play";
import { SendAltIcon } from "@/components/ui/icons/send-alt";
import { XmarkIcon } from "@/components/ui/icons/xmark";
import { useVoiceAudio } from "@/hooks/use-voice-audio";

interface VoicePreviewPillProps {
  audioUrl: string;
  duration?: number;
  isProcessing?: boolean;
  transcript?: string;
  onDiscard: () => void;
  onSend: () => void;
  onTranscriptChange?: (text: string) => void;
}

/**
 * The recording, ready to send. It keeps the recording bar's own shape — discard
 * on the left, the wave in the middle, the round action button outside the pill
 * — so stopping a recording changes what the controls do, not where they are.
 */
export function VoicePreviewPill({
  audioUrl,
  duration = 0,
  isProcessing = false,
  transcript = "",
  onDiscard,
  onSend,
  onTranscriptChange,
}: VoicePreviewPillProps) {
  const audio = useVoiceAudio(duration);

  const discard = () => {
    audio.pause();
    onDiscard();
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-end gap-2.5">
        <div className="flex min-h-13 min-w-0 flex-1 items-center gap-3 rounded-surface bg-jumpa-white py-2 pr-3.5 pl-3.5">
          {/* biome-ignore lint/a11y/useMediaCaption: a voice note is the caption's own source */}
          <audio ref={audio.audioRef} src={audioUrl} preload="metadata" />

          <button
            type="button"
            onClick={discard}
            aria-label="Discard recording"
            className="tap shrink-0 text-jumpa-neutral-600 active:scale-90"
          >
            <XmarkIcon className="size-5.5" />
          </button>

          <button
            type="button"
            onClick={audio.toggle}
            disabled={isProcessing}
            aria-label={audio.isPlaying ? "Pause recording" : "Play recording"}
            className="tap flex size-9 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-white active:scale-95 disabled:opacity-50"
          >
            {audio.isPlaying ? (
              <PauseIcon className="size-4" />
            ) : (
              <PlayIcon className="ml-0.5 size-4" />
            )}
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="relative">
              <VoiceWaveform progress={audio.progress} className="h-5.5" />
              <input
                type="range"
                min={0}
                max={audio.length}
                step={0.1}
                value={audio.currentTime}
                onChange={audio.seek}
                disabled={isProcessing}
                aria-label="Seek recording"
                className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
            </div>

            <p className="flex items-center justify-between gap-2 text-[10px] leading-3 font-medium text-jumpa-neutral-425">
              <span className="tabular-nums">
                {audio.elapsed} / {audio.total}
              </span>
              {isProcessing ? (
                <span className="text-jumpa-primary-600">Transcribing…</span>
              ) : null}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSend}
          disabled={isProcessing}
          aria-label="Send voice note"
          className="tap mb-0.75 flex size-11.5 shrink-0 items-center justify-center rounded-pill bg-jumpa-primary-600 text-jumpa-white active:scale-95 disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="size-4.5 animate-spin rounded-full border-2 border-jumpa-white/40 border-t-jumpa-white" />
          ) : (
            <SendAltIcon className="size-5.5" />
          )}
        </button>
      </div>

      {/* What was heard, editable before it goes — the model reads this, not the audio. */}
      {transcript && !isProcessing ? (
        <input
          type="text"
          value={transcript}
          onChange={(event) => onTranscriptChange?.(event.target.value)}
          aria-label="Edit the transcript"
          placeholder="Edit the text if we misheard..."
          className="min-h-10 w-full rounded-surface bg-jumpa-white px-3.5 text-[13px] leading-5 font-medium text-jumpa-black outline-none placeholder:text-jumpa-black/30"
        />
      ) : null}
    </div>
  );
}
