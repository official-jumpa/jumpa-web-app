"use client";

import Image from "next/image";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  AttachmentSheet,
  type AttachmentSource,
} from "@/components/chat/attachment-sheet";
import {
  AttachmentStrip,
  type PendingAttachment,
} from "@/components/chat/attachment-strip";
import { VoiceTranscript, VoiceWave } from "@/components/chat/voice-bar";
import { CirclePlusIcon } from "@/components/ui/icons/circle-plus";
import { MicrophoneIcon } from "@/components/ui/icons/microphone";
import { SendAltIcon } from "@/components/ui/icons/send-alt";
import { ResultSheet } from "@/components/ui/result-sheet";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import {
  type ChatAttachment,
  formatFileSize,
  isImageAttachment,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
} from "@/lib/chat-attachments";

/** How tall the field is allowed to grow before it starts scrolling. */
const MAX_LINES = 3;

interface ChatComposerProps {
  value?: string;
  onChange?: (val: string) => void;
  onSend?: (attachments?: ChatAttachment[]) => void;
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
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  // Object URLs outlive the component unless they are handed back.
  const previewsRef = useRef<string[]>([]);

  const [unsupported, setUnsupported] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

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

  useEffect(() => {
    const previews = previewsRef.current;
    return () => {
      for (const url of previews) URL.revokeObjectURL(url);
    };
  }, []);

  const dropPreview = (url?: string) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    previewsRef.current = previewsRef.current.filter((held) => held !== url);
  };

  // Stored on pick rather than on send, so the message goes out as soon as the
  // user presses send and a slow upload never looks like a slow reply.
  const upload = async (key: string, file: File) => {
    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/chat/attachments", {
        method: "POST",
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setPending((prev) =>
        prev.map((item) =>
          item.key === key ? { ...item, uploaded: data.attachment } : item,
        ),
      );
    } catch (err) {
      console.error("[ChatComposer] Attachment upload failed:", err);
      setPending((prev) => {
        dropPreview(prev.find((item) => item.key === key)?.preview);
        return prev.filter((item) => item.key !== key);
      });
      setNotice(
        `We couldn't upload "${file.name}". Check your connection and try again.`,
      );
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;

    const room = MAX_ATTACHMENTS - pending.length;
    if (room <= 0) {
      setNotice(
        `You can attach up to ${MAX_ATTACHMENTS} files to one message. Send these first.`,
      );
      return;
    }

    const picked = Array.from(files).slice(0, room);
    const accepted = picked.filter((file) => file.size <= MAX_ATTACHMENT_BYTES);

    if (accepted.length < picked.length) {
      setNotice(
        `Files have to be under ${formatFileSize(MAX_ATTACHMENT_BYTES)}. The larger ones weren't added.`,
      );
    }
    if (!accepted.length) return;

    const entries: PendingAttachment[] = accepted.map((file) => {
      const preview = isImageAttachment(file.type)
        ? URL.createObjectURL(file)
        : undefined;
      if (preview) previewsRef.current.push(preview);

      return {
        key: crypto.randomUUID(),
        name: file.name || "attachment",
        mime: file.type || "application/octet-stream",
        size: file.size,
        preview,
      };
    });

    setPending((prev) => [...prev, ...entries]);
    entries.forEach((entry, index) => {
      upload(entry.key, accepted[index]);
    });
  };

  const removeAttachment = (key: string) => {
    setPending((prev) => {
      dropPreview(prev.find((item) => item.key === key)?.preview);
      return prev.filter((item) => item.key !== key);
    });
  };

  // The sheet closes and the input opens in the same gesture, so the picker is
  // still allowed to open on iOS.
  const openPicker = (source: AttachmentSource) => {
    setSheetOpen(false);
    const field =
      source === "image" ? imageRef : source === "file" ? fileRef : cameraRef;
    field.current?.click();
  };

  const hasText = !!value.trim();
  const ready = pending
    .map((item) => item.uploaded)
    .filter((item) => item !== undefined) as ChatAttachment[];
  const storing = pending.length !== ready.length;
  // Anything held turns the mic into a send button, even before it is stored.
  const sendMode = hasText || pending.length > 0;
  const canSend = !disabled && !storing && (hasText || ready.length > 0);

  const send = () => {
    if (!canSend) return;
    onSend?.(ready.length ? ready : undefined);
    for (const item of pending) dropPreview(item.preview);
    setPending([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends only where Shift+Enter is reachable. On touch it breaks the
    // line instead, since the send button sits right beside the field.
    const hasKeyboard = window.matchMedia("(pointer: fine)").matches;
    if (e.key === "Enter" && !e.shiftKey && hasKeyboard) {
      e.preventDefault();
      send();
    }
  };

  const handleMicClick = () => {
    if (!isSupported) {
      setUnsupported(true);
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
            if (hasText && !disabled) send();
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
    <>
      <AttachmentStrip items={pending} onRemove={removeAttachment} />

      <div className="flex items-end gap-2.5">
        <div className="flex min-h-13 flex-1 items-end gap-2.5 rounded-surface bg-jumpa-white p-1">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
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
            if (sendMode) {
              send();
            } else {
              handleMicClick();
            }
          }}
          disabled={disabled || (sendMode && !canSend)}
          aria-label={sendMode ? "Send message" : "Dictate a message"}
          className={`tap relative mb-0.75 flex size-11.5 shrink-0 items-center justify-center overflow-hidden rounded-pill active:scale-95 ${
            sendMode
              ? "bg-jumpa-primary-600 text-jumpa-white shadow-xs hover:bg-jumpa-primary-700"
              : "bg-jumpa-alt-400 text-jumpa-secondary-600 hover:opacity-90"
          } disabled:opacity-50`}
        >
          {sendMode ? (
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

      {/* Kept outside the sheet so closing it does not cancel the picker. */}
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {sheetOpen ? (
        <AttachmentSheet
          onPick={openPicker}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}

      {notice ? (
        <ResultSheet
          title="That didn't go through"
          message={notice}
          onClose={() => setNotice(null)}
        />
      ) : null}

      {unsupported ? (
        <ResultSheet
          title="Voice typing isn't available"
          message="This browser doesn't support speech recognition. Type your message instead — everything else works the same."
          onClose={() => setUnsupported(false)}
        />
      ) : null}
    </>
  );
}
