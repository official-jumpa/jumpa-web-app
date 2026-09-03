"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechToText(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  /** Whether the user still wants to record — `onend` restarts while this holds. */
  const wantedRef = useRef(false);
  /** Speech settled so far. The engine resets its results on every restart. */
  const settledRef = useRef("");

  // Keep a ref to callback to prevent stale closures without re-initializing recognition
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSupported(false);
        return;
      }

      const recognition = new SpeechRecognition();
      // Continuous, or the engine ends the session at the first pause — about a
      // second of silence — and dictation dies mid-sentence.
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let interim = "";
        // Only what changed: settled phrases are banked, interim ones are
        // replaced on the next event.
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) settledRef.current += result[0].transcript;
          else interim += result[0].transcript;
        }

        const transcript = settledRef.current + interim;
        if (transcript.trim() && callbackRef.current) {
          callbackRef.current(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[SpeechRecognition]", event.error);
        // Silence and dropped connections are recoverable — `onend` restarts
        // them. A refused or missing microphone is not.
        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed" ||
          event.error === "audio-capture"
        ) {
          wantedRef.current = false;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Engines stop on their own long before the user is done, so keep going
        // until they actually ask to stop.
        if (wantedRef.current) {
          try {
            recognition.start();
            return;
          } catch (err) {
            console.warn("[SpeechRecognition Restart Error]", err);
          }
        }
        wantedRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      wantedRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        settledRef.current = "";
        wantedRef.current = true;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        wantedRef.current = false;
        console.warn("[SpeechRecognition Start Error]", err);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        wantedRef.current = false;
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("[SpeechRecognition Stop Error]", err);
      }
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}
