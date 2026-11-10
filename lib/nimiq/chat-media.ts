import { analyzeImageWithGemini } from "@/lib/ai/vision";
import {
  type ChatAttachment,
  describeAttachments,
  isAudioAttachment,
  isImageAttachment,
} from "@/lib/chat-attachments";

const UNHEARD =
  "[The user sent a voice note that could not be transcribed. Ask them to type it.]";

/** What the Nimiq chat accepts: photos, voice notes and PDFs. */
export const isNimiqChatFile = (mime: string) =>
  isImageAttachment(mime) ||
  mime.startsWith("audio/") ||
  mime === "application/pdf";

/** Only files our own storage holds are read, so the route can't be pointed elsewhere. */
export function isStoredFile(url: string) {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === "https:" &&
      (hostname === "vercy.fun" || hostname.endsWith(".vercy.fun"))
    );
  } catch {
    return false;
  }
}

/** A turn's text with its files described; `read` also runs vision on its photos. */
export async function withAttachments(
  content: string,
  attachments: ChatAttachment[] | undefined,
  read: boolean,
): Promise<string> {
  const stored = (attachments ?? []).filter((file) => isStoredFile(file.url));
  // A voice note's text is already its transcript.
  const files = stored.filter(
    (file) => !isAudioAttachment(file.mime, file.name),
  );
  if (!files.length) {
    return content || (stored.length ? UNHEARD : content);
  }
  const photos = read
    ? files.filter((file) => isImageAttachment(file.mime))
    : [];
  const vision = (
    await Promise.all(
      photos.map((photo) => analyzeImageWithGemini(photo.url, content)),
    )
  )
    .map((result) => result.analysis)
    .filter(Boolean)
    .join("\n\n");
  return [content, describeAttachments(files, vision)]
    .filter(Boolean)
    .join("\n\n");
}
