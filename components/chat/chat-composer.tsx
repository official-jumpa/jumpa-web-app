"use client";

import Image from "next/image";
import type React from "react";
import { useEffect, useRef } from "react";
import { VoiceTranscript, VoiceWave } from "@/components/chat/voice-bar";
import { CirclePlusIcon } from "@/components/ui/icons/circle-plus";
import { MicrophoneIcon } from "@/components/ui/icons/microphone";
import { SendAltIcon } from "@/components/ui/icons/send-alt";
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

  // The recording pill replaces the field: bare waveform until the first words
  // come back, then the transcript with its own discard and stop controls.
  if (isListening) {
    return (
      <div className="flex items-end gap-2.5">
        {hasText ? (
          <VoiceTranscript
            text={value}
            onDiscard={() => {
              toggleListening();
              onChange?.("");
            }}
            onStop={toggleListening}
          />
        ) : (
          <VoiceWave />
        )}

        <button
          type="button"
          onClick={() => {
            toggleListening();
            if (hasText && !disabled) onSend?.();
          }}
          aria-label={hasText ? "Send message" : "Stop recording"}
          className="tap flex size-11.5 shrink-0 items-center justify-center rounded-pill bg-jumpa-alt-400 text-jumpa-primary-600 active:scale-95"
        >
          <SendAltIcon className="size-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2.5">
      <div className="flex min-h-13 flex-1 items-end gap-2.5 rounded-surface bg-jumpa-white p-1">
        <button
          type="button"
          aria-label="Add an attachment"
          className="flex h-11 w-11.5 shrink-0 items-center justify-center rounded-pill bg-jumpa-neutral-250 text-jumpa-grey-600 tap hover:bg-jumpa-neutral-300 active:scale-95 cursor-pointer"
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
          placeholder="Tap to start typing..."
          className="my-3 min-w-0 flex-1 resize-none overflow-y-auto pr-2.5 text-[13px] leading-5 font-medium text-jumpa-black outline-none [scrollbar-width:none] placeholder:text-jumpa-black/30 disabled:opacity-50"
          autoFocus
        />
      </div>

      <button
        type="button"
        onClick={() => {
          if (hasText && !disabled) {
            onSend?.();
          } else {
            handleMicClick();
          }
        }}
        disabled={disabled}
        aria-label={hasText ? "Send message" : "Dictate a message"}
        className={`tap relative mb-0.75 flex size-11.5 shrink-0 items-center justify-center overflow-hidden rounded-pill active:scale-95 ${
          hasText
            ? "bg-jumpa-primary-600 text-jumpa-white shadow-xs hover:bg-jumpa-primary-700"
            : "bg-jumpa-alt-400 text-jumpa-secondary-600 hover:opacity-90"
        } disabled:opacity-50`}
      >
        {hasText ? (
          <Image
            src="/images/chat/send_icon.svg"
            alt="send icon"
            fill
            priority
            className="object-cover"
          />
        ) : (
          <MicrophoneIcon className="size-6" />
        )}
      </button>
    </div>
  );
}
