"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";

interface VoicePlayerProps {
  url: string;
  name?: string;
  align?: "user" | "agent";
  transcript?: string;
}

const SPEED_OPTIONS = [1, 1.5, 2];

export function VoicePlayer({
  url,
  name = "Voice Note",
  align = "user",
  transcript,
}: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !Number.isNaN(audio.duration) && Number.isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
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
  }, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn("[VoicePlayer] Audio playback error:", err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Number(e.target.value);
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const cycleSpeed = () => {
    const nextIndex = (speedIndex + 1) % SPEED_OPTIONS.length;
    setSpeedIndex(nextIndex);
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEED_OPTIONS[nextIndex];
    }
  };

  const formatTime = (secs: number) => {
    const safeSecs = Math.max(0, Math.floor(secs));
    const m = Math.floor(safeSecs / 60);
    const s = safeSecs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const effectiveDuration = duration || 1;
  const progressPercent = Math.min(100, (currentTime / effectiveDuration) * 100);

  const isUser = align === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`flex max-w-[280px] sm:max-w-[320px] items-center gap-2.5 rounded-2xl p-2.5 shadow-xs transition-all ${
          isUser
            ? "bg-jumpa-primary-600 text-jumpa-white"
            : "bg-jumpa-neutral-100 text-jumpa-black"
        }`}
      >
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        className={`tap flex size-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 cursor-pointer ${
          isUser
            ? "bg-jumpa-white text-jumpa-primary-600 shadow-xs hover:bg-jumpa-neutral-50"
            : "bg-jumpa-primary-600 text-jumpa-white shadow-xs hover:bg-jumpa-primary-700"
        }`}
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
        <div className="relative flex items-center h-2.5 w-full">
          <input
            type="range"
            min={0}
            max={effectiveDuration}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Seek voice note playback"
            className="absolute inset-0 z-10 w-full opacity-0 cursor-pointer"
          />
          {/* Track */}
          <div
            className={`h-1.5 w-full rounded-full overflow-hidden ${
              isUser ? "bg-jumpa-white/30" : "bg-jumpa-neutral-250"
            }`}
          >
            <div
              className={`h-full transition-all duration-75 ${
                isUser ? "bg-jumpa-white" : "bg-jumpa-primary-600"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div
          className={`flex items-center justify-between text-[11px] font-medium leading-none ${
            isUser ? "text-jumpa-white/80" : "text-jumpa-grey-600"
          }`}
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(effectiveDuration)}</span>
        </div>
      </div>

      {/* Playback Speed Pill */}
      <button
        type="button"
        onClick={cycleSpeed}
        aria-label="Change playback speed"
        className={`tap shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-opacity active:scale-95 cursor-pointer ${
          isUser
            ? "bg-jumpa-white/20 text-jumpa-white hover:bg-jumpa-white/30"
            : "bg-jumpa-neutral-200 text-jumpa-grey-700 hover:bg-jumpa-neutral-250"
        }`}
      >
        {SPEED_OPTIONS[speedIndex]}x
      </button>
    </div>

    {/* Option B: Minimal View Transcript Toggle */}
    {transcript && (
      <div className={`mt-1 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <button
          type="button"
          onClick={() => setShowTranscript((prev) => !prev)}
          className={`tap text-[11px] font-medium transition-opacity hover:opacity-100 cursor-pointer ${
            isUser ? "text-jumpa-grey-500" : "text-jumpa-grey-600"
          }`}
        >
          {showTranscript ? "Hide transcript" : "View transcript"}
        </button>

        {showTranscript && (
          <p
            className={`mt-1 rounded-xl px-2.5 py-1.5 text-xs font-normal leading-relaxed max-w-[280px] sm:max-w-[320px] select-text break-words ${
              isUser
                ? "bg-jumpa-neutral-100 text-jumpa-black"
                : "bg-jumpa-neutral-100 text-jumpa-black"
            }`}
          >
            {transcript}
          </p>
        )}
      </div>
    )}
  </div>
  );
}
