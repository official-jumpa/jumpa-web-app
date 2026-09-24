"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const SPEEDS = [1, 1.5, 2];

/** `0:07`. */
export function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/**
 * One `<audio>` element's playback state, shared by the sent voice note and the
 * composer's review pill so the two can never behave differently. The consumer
 * renders the element and owns its `src`; this only drives it.
 *
 * `fallbackDuration` is what the recorder measured. It is the only length we
 * have until the browser works the real one out.
 */
export function useVoiceAudio(fallbackDuration = 0) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const probing = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration);
  const [speedIndex, setSpeedIndex] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const readDuration = () => {
      const value = audio.duration;
      if (!Number.isFinite(value) || value <= 0) return false;
      setDuration(value);
      return true;
    };

    const onLoadedMetadata = () => {
      if (readDuration()) return;
      // A clip from `MediaRecorder` carries no duration in its container, so
      // the browser reports Infinity until it has seen the end of the stream.
      // Seeking past the end is what makes it work the real length out.
      probing.current = true;
      audio.currentTime = 1e9;
    };

    const onDurationChange = () => {
      if (!readDuration() || !probing.current) return;
      probing.current = false;
      audio.currentTime = 0;
    };

    const onTimeUpdate = () => {
      if (probing.current) return;
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const onPause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      probing.current = false;
    };
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    audio.playbackRate = SPEEDS[speedIndex];
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.warn("[useVoiceAudio] Playback refused:", err);
        setIsPlaying(false);
      });
  }, [speedIndex]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Number(event.target.value);
    audio.currentTime = target;
    setCurrentTime(target);
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeedIndex((index) => {
      const next = (index + 1) % SPEEDS.length;
      if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
      return next;
    });
  }, []);

  // A zero here would make the scrubber's max zero and the fill NaN.
  const length = duration > 0 ? duration : fallbackDuration || 1;

  return {
    audioRef,
    isPlaying,
    currentTime,
    /** The best length we have: measured, then the recorder's, then 1. */
    length,
    /** 0–1, for the waveform fill. */
    progress: Math.min(1, currentTime / length),
    speed: SPEEDS[speedIndex],
    elapsed: formatClock(currentTime),
    total: formatClock(length),
    toggle,
    pause,
    seek,
    cycleSpeed,
  };
}
