"use client";

import type React from "react";
import { CirclePlusIcon } from "@/components/ui/icons/circle-plus";
import { MicrophoneIcon } from "@/components/ui/icons/microphone";
import { useSpeechToText } from "@/hooks/use-speech-to-text";

interface ChatComposerProps {
  value?: string;
  onChange?: (val: string) => void;
  onSend?: () => void;
  disabled?: boolean;
}

/** Message entry with live Speech-to-Text dictation support. */
export function ChatComposer({
  value = "",
  onChange,
  onSend,
  disabled = false,
}: ChatComposerProps) {
  const { isListening, isSupported, toggleListening } = useSpeechToText(
    (transcript) => {
      onChange?.(transcript);
    },
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend?.();
      }
    }
  };

  const hasText = !!value.trim();

  const handleMicClick = () => {
    if (!isSupported) {
      alert(
        "Speech recognition is not supported in this browser. Please type your message.",
      );
      return;
    }
    toggleListening();
  };

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex h-11.5 flex-1 items-center gap-2.5 rounded-surface bg-jumpa-white p-1 transition-all ${
          isListening ? "ring-2 ring-jumpa-primary-600/50 shadow-md" : ""
        }`}
      >
        <button
          type="button"
          aria-label="Add an attachment"
          className="flex h-full w-11.5 shrink-0 items-center justify-center rounded-pill bg-jumpa-neutral-250 text-jumpa-grey-600 transition-colors hover:bg-jumpa-neutral-300 active:scale-95 cursor-pointer"
        >
          <CirclePlusIcon className="size-6" />
        </button>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Message Jumpa"
          placeholder={
            isListening
              ? "Listening... You can start taking now..."
              : "Tap to start typing..."
          }
          className={`min-w-0 flex-1 pr-2.5 text-[11px] leading-5 font-medium outline-none placeholder:text-jumpa-black/30 disabled:opacity-50 ${
            isListening
              ? "text-jumpa-primary-600 animate-pulse placeholder:text-jumpa-primary-600"
              : "text-jumpa-black"
          }`}
          autoFocus
        />
      </div>

      <button
        type="button"
        onClick={() => {
          if (isListening) {
            toggleListening();
          } else if (hasText && !disabled) {
            onSend?.();
          } else {
            handleMicClick();
          }
        }}
        disabled={disabled}
        aria-label={
          isListening
            ? "Stop dictation"
            : hasText
              ? "Send message"
              : "Dictate a message"
        }
        className={`flex size-11.5 shrink-0 items-center justify-center rounded-pill transition-all active:scale-95 cursor-pointer ${
          isListening
            ? "bg-red-500 text-jumpa-white animate-pulse shadow-lg ring-2 ring-red-400"
            : hasText
              ? "bg-jumpa-primary-600 text-jumpa-white hover:bg-jumpa-primary-700 shadow-xs"
              : "bg-jumpa-alt-400 text-jumpa-secondary-600 hover:opacity-90"
        } disabled:opacity-50`}
      >
        {isListening ? (
          <div className="size-3.5 rounded-xs bg-white" />
        ) : hasText ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        ) : (
          <MicrophoneIcon className="size-6" />
        )}
      </button>
    </div>
  );
}
