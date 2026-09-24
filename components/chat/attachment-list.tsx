"use client";

import { useEffect, useState } from "react";
import { FileIcon } from "@/components/ui/icons/file";
import {
  type ChatAttachment,
  formatFileSize,
  isAudioAttachment,
  isImageAttachment,
} from "@/lib/chat-attachments";
import { VoicePlayer } from "@/components/chat/voice-player";

/** What came with a message: images as thumbnails with inline zoom, audio as playable voice notes, anything else as a file row. */
export function AttachmentList({
  items,
  align,
  transcript,
}: {
  items: ChatAttachment[];
  align: "user" | "agent";
  transcript?: string;
}) {
  const [zoomedImage, setZoomedImage] = useState<ChatAttachment | null>(null);
  const [scale, setScale] = useState(1);

  const images = items.filter((item) => isImageAttachment(item.mime));
  const audioNotes = items.filter((item) => isAudioAttachment(item.mime, item.name));
  const files = items.filter(
    (item) => !isImageAttachment(item.mime) && !isAudioAttachment(item.mime, item.name),
  );

  // Dismiss on Escape key
  useEffect(() => {
    if (!zoomedImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setZoomedImage(null);
        setScale(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomedImage]);

  return (
    <>
      <div
        className={`flex w-full flex-col gap-2 ${align === "user" ? "items-end" : "items-start"}`}
      >
        {images.length ? (
          <div
            className={`flex flex-wrap gap-2 ${align === "user" ? "justify-end" : "justify-start"}`}
          >
            {images.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setZoomedImage(item);
                  setScale(1);
                }}
                className="tap group relative block size-30 overflow-hidden rounded-xl bg-jumpa-neutral-95 active:scale-[0.98] cursor-zoom-in text-left focus:outline-hidden"
                aria-label={`Zoom ${item.name}`}
              >
                {/* biome-ignore lint/performance/noImgElement: the file is served from a session-scoped route or CDN */}
                <img
                  src={item.url}
                  alt={item.name}
                  className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        ) : null}

        {audioNotes.length ? (
          <div
            className={`flex flex-col gap-2 ${align === "user" ? "items-end" : "items-start"}`}
          >
            {audioNotes.map((item) => (
              <VoicePlayer
                key={item.id}
                url={item.url}
                name={item.name}
                align={align}
                transcript={transcript}
              />
            ))}
          </div>
        ) : null}

        {files.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="tap flex max-w-full items-center gap-2 rounded-xl bg-jumpa-neutral-95 px-3 py-2.5 active:scale-[0.99]"
          >
            <FileIcon className="size-6 shrink-0 text-jumpa-primary-600" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] leading-4 font-medium text-jumpa-black">
                {item.name}
              </span>
              <span className="text-[11px] leading-3.5 text-jumpa-neutral-425">
                {formatFileSize(item.size)}
              </span>
            </span>
          </a>
        ))}
      </div>

      {/* In-app Zoom Overlay (Never opens a new tab or browser fullscreen) */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => {
            setZoomedImage(null);
            setScale(1);
          }}
          role="dialog"
          aria-modal="true"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              setZoomedImage(null);
              setScale(1);
            }}
            className="absolute top-4 right-4 z-50 flex size-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition hover:bg-white/30 active:scale-95 cursor-pointer"
            aria-label="Close zoomed view"
          >
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Zoomable Image Container */}
          <div
            className="relative flex max-h-[85vh] max-w-[90vw] items-center justify-center overflow-hidden rounded-2xl"
            onClick={(e) => {
              e.stopPropagation();
              setScale((prev) => (prev === 1 ? 1.75 : 1));
            }}
          >
            {/* biome-ignore lint/performance/noImgElement: direct CDN image rendering */}
            <img
              src={zoomedImage.url}
              alt={zoomedImage.name}
              style={{ transform: `scale(${scale})` }}
              className={`max-h-[80vh] max-w-[88vw] object-contain rounded-xl transition-transform duration-200 select-none shadow-2xl ${
                scale === 1 ? "cursor-zoom-in" : "cursor-zoom-out"
              }`}
            />
          </div>

          {/* Subtitle / Hint badge */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md select-none pointer-events-none">
            {scale === 1
              ? "Tap image to zoom in • Tap outside to close"
              : "Tap image to reset • Tap outside to close"}
          </div>
        </div>
      )}
    </>
  );
}
