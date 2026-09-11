import { FileIcon } from "@/components/ui/icons/file";
import {
  type ChatAttachment,
  formatFileSize,
  isImageAttachment,
} from "@/lib/chat-attachments";

/** What came with a message: images as thumbnails, anything else as a row. */
export function AttachmentList({
  items,
  align,
}: {
  items: ChatAttachment[];
  align: "user" | "agent";
}) {
  const images = items.filter((item) => isImageAttachment(item.mime));
  const files = items.filter((item) => !isImageAttachment(item.mime));

  return (
    <div
      className={`flex w-full flex-col gap-2 ${align === "user" ? "items-end" : "items-start"}`}
    >
      {images.length ? (
        <div
          className={`flex flex-wrap gap-2 ${align === "user" ? "justify-end" : "justify-start"}`}
        >
          {images.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="tap block size-30 overflow-hidden rounded-xl bg-jumpa-neutral-95 active:scale-[0.99]"
            >
              {/* biome-ignore lint/performance/noImgElement: the file is served from a session-scoped route the image optimiser cannot reach */}
              <img
                src={item.url}
                alt={item.name}
                className="size-full object-cover"
              />
            </a>
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
  );
}
