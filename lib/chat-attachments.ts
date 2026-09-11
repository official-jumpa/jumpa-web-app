/** What the chat accepts on a message, shared by the composer and the API. */
export type ChatAttachment = {
  /** GridFS id. It is also the path segment the file is served from. */
  id: string;
  url: string;
  name: string;
  mime: string;
  size: number;
};

/** A phone photo sits well under this; a video deliberately does not. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** More than four in one message and the strip stops being readable. */
export const MAX_ATTACHMENTS = 4;

export function isImageAttachment(mime: string) {
  return mime.startsWith("image/");
}

/** The size that reads under a file name. */
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * The model only reads text, so an attachment reaches it as a line naming what
 * came with the message. Without it an image-only message arrives empty, and
 * without the caveat the model answers as though it had opened the file.
 */
export function describeAttachments(attachments?: ChatAttachment[]) {
  if (!attachments?.length) return "";

  const list = attachments
    .map((file) => `${file.name} (${file.mime || "file"})`)
    .join(", ");
  const count =
    attachments.length === 1 ? "a file" : `${attachments.length} files`;

  return `[The user attached ${count}: ${list}. You cannot open or read attachments — say so plainly if they ask what is in one.]`;
}
