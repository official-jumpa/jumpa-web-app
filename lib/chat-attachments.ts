/** What the chat accepts on a message, shared by the composer and the API. */
export type ChatAttachment = {
  /** Unique attachment ID. */
  id: string;
  url: string;
  name: string;
  mime: string;
  size: number;
};

/** A phone photo sits well under this; a video deliberately does not. 5MB max */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** More than four in one message and the strip stops being readable. */
export const MAX_ATTACHMENTS = 4;

export function isImageAttachment(mime: string) {
  return mime.startsWith("image/");
}

export function isAudioAttachment(mime: string, name?: string) {
  if (mime?.startsWith("audio/")) return true;
  if (name) {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext && ["webm", "mp3", "m4a", "wav", "ogg", "aac"].includes(ext)) {
      return true;
    }
  }
  return false;
}

/** The size that reads under a file name. */
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Formats attachment details and optional Gemini 2.5 Flash visual analysis
 *  */
export function describeAttachments(
  attachments?: ChatAttachment[],
  visionAnalysis?: string,
) {
  if (!attachments?.length) return "";

  const list = attachments
    .map((file) => `${file.name} (${file.mime || "file"}: ${file.url})`)
    .join(", ");
  const count =
    attachments.length === 1 ? "a file" : `${attachments.length} files`;

  if (visionAnalysis?.trim()) {
    return `[The user attached ${count}: ${list}.\nVisual Intelligence Analysis of attached media:\n${visionAnalysis.trim()}]`;
  }

  return `[The user attached ${count}: ${list}. Media URL(s) available in message attachments.]`;
}
