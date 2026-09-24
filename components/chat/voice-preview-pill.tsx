"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { TrashAltIcon } from "@/components/ui/icons/trash-alt";
import { SendAltIcon } from "@/components/ui/icons/send-alt";

interface VoicePreviewPillProps {
  audioUrl: string;
  duration?: number;
  isProcessing?: boolean;
  transcript?: string;
  onDiscard: () => void;
  onSend: () => void;
  onTranscriptChange?: (text: string) => void;
}

export function VoicePreviewPill({
  audioUrl,
  duration = 0,
  isProcessing = false,
  transcript = "",
  onDiscard,
  onSend,
  onTranscriptChange,
}: VoicePreviewPillProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [isDiscarding, setIsDiscarding] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !Number.isNaN(audio.duration) && Number.isFinite(audio.duration)) {
        setAudioDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn("[VoicePreviewPill] Audio play error:", err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const targetTime = Number(e.target.value);
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleDiscard = async () => {
    if (isDiscarding) return;
    setIsDiscarding(true);
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      await onDiscard();
    } finally {
      setIsDiscarding(false);
    }
  };

  const formatTime = (secs: number) => {
    const safeSecs = Math.max(0, Math.floor(secs));
    const m = Math.floor(safeSecs / 60);
    const s = safeSecs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const effectiveDuration = audioDuration || duration || 1;
  const progressPercent = Math.min(100, (currentTime / effectiveDuration) * 100);

  return (
    <div className="flex w-full flex-col gap-2">
      {/* Audio player card */}
      <div className="flex min-h-13 items-center gap-3 rounded-surface bg-jumpa-white px-3 py-2 shadow-xs border border-jumpa-neutral-100">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        {/* Discard / Delete from Vercy Storage Button */}
        <button
          type="button"
          onClick={handleDiscard}
          disabled={isDiscarding}
          aria-label="Discard voice note"
          title="Discard and delete recording"
          className="tap flex size-8 shrink-0 items-center justify-center rounded-full text-jumpa-grey-500 hover:bg-jumpa-neutral-100 hover:text-red-500 active:scale-95 transition-colors cursor-pointer disabled:opacity-50"
        >
          <TrashAltIcon className="size-4" />
        </button>

        {/* Play / Pause Toggle Button */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={isProcessing}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="tap flex size-9 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-white shadow-xs hover:bg-jumpa-primary-700 active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
        >
          {isPlaying ? (
            <svg className="size-4 fill-current" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1.5" />
              <rect x="14" y="5" width="4" height="14" rx="1.5" />
            </svg>
          ) : (
            <svg className="size-4 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86a1 1 0 00-1.5.86z" />
            </svg>
          )}
        </button>

        {/* Scrubber & Duration */}
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="relative flex items-center h-3 w-full">
            <input
              type="range"
              min={0}
              max={effectiveDuration}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              disabled={isProcessing}
              aria-label="Audio playback seek"
              className="absolute inset-0 z-10 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            {/* Visual Track */}
            <div className="h-1.5 w-full rounded-full bg-jumpa-neutral-200 overflow-hidden">
              <div
                className="h-full bg-jumpa-primary-600 transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-medium text-jumpa-grey-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(effectiveDuration)}</span>
          </div>
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={onSend}
          disabled={isProcessing || isDiscarding}
          aria-label="Send voice message"
          className="tap flex size-10 shrink-0 items-center justify-center rounded-pill bg-jumpa-primary-600 text-jumpa-white shadow-xs hover:bg-jumpa-primary-700 active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <SendAltIcon className="size-5" />
          )}
        </button>
      </div>

      {/* Editable Transcript Bar */}
      {transcript && !isProcessing && (
        <div className="flex items-center gap-2 rounded-xl bg-jumpa-neutral-50 px-3 py-1.5 text-xs text-jumpa-black border border-jumpa-neutral-100">
          <input
            type="text"
            value={transcript}
            onChange={(e) => onTranscriptChange?.(e.target.value)}
            placeholder="Edit text if needed..."
            className="min-w-0 flex-1 bg-transparent text-xs font-medium text-jumpa-black outline-none placeholder:text-jumpa-grey-400"
          />
        </div>
      )}
    </div>
  );
}
