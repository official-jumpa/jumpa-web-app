"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { CirclePlusIcon } from "@/components/ui/icons/circle-plus";
import { MicrophoneIcon } from "@/components/ui/icons/microphone";
import { useSpeechToText } from "@/hooks/use-speech-to-text";

/** How tall the field is allowed to grow before it starts scrolling. */
const MAX_LINES = 3;

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
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const { isListening, isSupported, toggleListening } = useSpeechToText(
    (transcript) => {
      onChange?.(transcript);
    },
  );

  // Grow to fit, then scroll. The cap comes off computed style so it follows
  // the field's own line height; the gutter is margin, not padding, which keeps
  // the scroll box an exact multiple of a line — no half-line at the top edge.
  // biome-ignore lint/correctness/useExhaustiveDependencies: value is the trigger, including when the parent clears it after a send
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    const max = parseFloat(getComputedStyle(field).lineHeight) * MAX_LINES;

    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, max)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends only where Shift+Enter is reachable. On touch it breaks the
    // line instead, since the send button sits right beside the field.
    const hasKeyboard = window.matchMedia("(pointer: fine)").matches;
    if (e.key === "Enter" && !e.shiftKey && hasKeyboard) {
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
    <div className="flex items-end gap-2.5">
      <div
        className={`flex min-h-13 flex-1 items-end gap-2.5 rounded-surface bg-jumpa-white p-1 transition-all ${
          isListening ? "ring-2 ring-jumpa-primary-600/50 shadow-md" : ""
        }`}
      >
        <button
          type="button"
          aria-label="Add an attachment"
          className="flex h-11 w-11.5 shrink-0 items-center justify-center rounded-pill bg-jumpa-neutral-250 text-jumpa-grey-600 transition-colors hover:bg-jumpa-neutral-300 active:scale-95 cursor-pointer"
        >
          <CirclePlusIcon className="size-6" />
        </button>

        <textarea
          ref={fieldRef}
          rows={1}
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
          className={`my-3 min-w-0 flex-1 resize-none overflow-y-auto pr-2.5 text-[13px] leading-5 font-medium outline-none [scrollbar-width:none] placeholder:text-jumpa-black/30 disabled:opacity-50 ${
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
        className={`mb-0.75 flex size-11.5 shrink-0 items-center justify-center rounded-pill transition-all active:scale-95 cursor-pointer ${
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
