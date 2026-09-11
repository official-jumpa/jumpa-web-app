"use client";

import { FileIcon } from "@/components/ui/icons/file";
import { XmarkIcon } from "@/components/ui/icons/xmark";
import { type ChatAttachment, formatFileSize } from "@/lib/chat-attachments";

/**
 * One file the composer is holding. It is on screen the moment it is picked and
 * uploads in the background, so `uploaded` is what says it can be sent.
 */
export type PendingAttachment = {
  key: string;
  name: string;
  mime: string;
  size: number;
  /** Object URL, so a picked image shows before its upload finishes. */
  preview?: string;
  uploaded?: ChatAttachment;
};

/** What is about to be sent, above the field. Scrolls rather than wrapping. */
export function AttachmentStrip({
  items,
  onRemove,
}: {
  items: PendingAttachment[];
  onRemove: (key: string) => void;
}) {
  if (!items.length) return null;

  return (
    <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
      {items.map((item) => (
        <li key={item.key} className="relative shrink-0 pt-1.5 pr-1.5">
          {item.preview ? (
            <span className="block size-14 overflow-hidden rounded-lg bg-jumpa-white">
              {/* biome-ignore lint/performance/noImgElement: a blob URL cannot go through next/image */}
              <img
                src={item.preview}
                alt={item.name}
                className="size-full object-cover"
              />
            </span>
          ) : (
            <span className="flex h-14 max-w-40 items-center gap-2 rounded-lg bg-jumpa-white px-2.5">
              <FileIcon className="size-5 shrink-0 text-jumpa-primary-600" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[11px] leading-3.5 font-medium text-jumpa-black">
                  {item.name}
                </span>
                <span className="text-[10px] leading-3 text-jumpa-neutral-425">
                  {formatFileSize(item.size)}
                </span>
              </span>
            </span>
          )}

          {/* Covers the chip until it is stored, so nothing looks ready early. */}
          {item.uploaded ? null : (
            <span className="absolute inset-0 mt-1.5 mr-1.5 flex items-center justify-center rounded-lg bg-jumpa-black/45">
              <span
                aria-hidden="true"
                className="size-5 animate-spin rounded-full border-2 border-jumpa-white/40 border-t-jumpa-white"
              />
            </span>
          )}

          <button
            type="button"
            onClick={() => onRemove(item.key)}
            aria-label={`Remove ${item.name}`}
            className="tap absolute top-0 right-0 flex size-5 items-center justify-center rounded-full bg-jumpa-black text-jumpa-white active:scale-90"
          >
            <XmarkIcon className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}
