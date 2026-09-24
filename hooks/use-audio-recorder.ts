"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface RecordedAudioResult {
  blob: Blob;
  mimeType: string;
  duration: number;
  previewUrl: string;
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveStopRef = useRef<((val: RecordedAudioResult | null) => void) | null>(null);
  const durationRef = useRef(0);

  // Check support on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const supported = Boolean(
        navigator.mediaDevices &&
          typeof navigator.mediaDevices.getUserMedia === "function" &&
          typeof window.MediaRecorder === "function",
      );
      setIsSupported(supported);
    }
  }, []);

  const cleanupAudioNodes = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudioNodes();
    };
  }, [cleanupAudioNodes]);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    durationRef.current = 0;
    setDuration(0);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Audio recording is not supported in this browser.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // Select supported audio MIME type
      let mimeType = "";
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/aac")) {
          mimeType = "audio/aac";
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const recordedMime = recorder.mimeType || mimeType || "audio/webm";
        const finalBlob = new Blob(chunksRef.current, { type: recordedMime });
        const finalDuration = durationRef.current;
        const previewUrl = URL.createObjectURL(finalBlob);

        cleanupAudioNodes();
        setIsRecording(false);
        setIsPaused(false);

        if (resolveStopRef.current) {
          if (finalBlob.size > 0) {
            resolveStopRef.current({
              blob: finalBlob,
              mimeType: recordedMime,
              duration: finalDuration,
              previewUrl,
            });
          } else {
            resolveStopRef.current(null);
          }
          resolveStopRef.current = null;
        }
      };

      // Set up AudioContext for real-time visualizer waveform
      try {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.6;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(1, avg / 128));
            animFrameRef.current = requestAnimationFrame(updateAudioLevel);
          };
          updateAudioLevel();
        }
      } catch (audioErr) {
        console.warn("[useAudioRecorder] Audio visualizer setup skipped:", audioErr);
      }

      // Collect data chunks every 250ms
      recorder.start(250);
      setIsRecording(true);
      setIsPaused(false);

      // Duration counter
      timerIntervalRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);

      return true;
    } catch (err: any) {
      console.error("[useAudioRecorder] Failed to start recording:", err);
      cleanupAudioNodes();
      setError(
        err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
          ? "Microphone access was denied. Please allow microphone permissions to record."
          : "Could not access microphone.",
      );
      setIsRecording(false);
      return false;
    }
  }, [cleanupAudioNodes]);

  const stopRecording = useCallback((): Promise<RecordedAudioResult | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        cleanupAudioNodes();
        setIsRecording(false);
        resolve(null);
        return;
      }

      resolveStopRef.current = resolve;
      try {
        recorder.stop();
      } catch (err) {
        console.warn("[useAudioRecorder] Error stopping recorder:", err);
        cleanupAudioNodes();
        setIsRecording(false);
        resolve(null);
      }
    });
  }, [cleanupAudioNodes]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      } catch {}
    }
    cleanupAudioNodes();
    chunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    if (resolveStopRef.current) {
      resolveStopRef.current(null);
      resolveStopRef.current = null;
    }
  }, [cleanupAudioNodes]);

  return {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    isSupported,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
