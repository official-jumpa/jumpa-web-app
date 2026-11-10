import type { NextRequest } from "next/server";
import { transcribeAudioWithGemini } from "@/lib/ai/audio";
import { formatFileSize, MAX_ATTACHMENT_BYTES } from "@/lib/chat-attachments";
import { saveChatAttachment } from "@/lib/functions/chatAttachmentFunctions";
import { fail, guardRequest, handleError, ok } from "@/lib/nimiq/api";
import { isNimiqChatFile } from "@/lib/nimiq/chat-media";

/** Stores a photo, PDF or voice note for the mini app's chat; `?mode=voice` also transcribes it. */
export async function POST(req: NextRequest) {
  const voice = req.nextUrl.searchParams.get("mode") === "voice";
  const stop = await guardRequest(req, {
    action: voice ? "chat_voice" : "chat_upload",
    perMinute: 10,
    perDay: 100,
  });
  if (stop) return stop;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail("No file was sent.", 400);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return fail(
      `File is larger than ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`,
      413,
    );
  }
  if (!isNimiqChatFile(file.type)) {
    return fail("Send a photo, a PDF or a voice note.", 415);
  }

  try {
    const attachment = await saveChatAttachment("nimiq", file);
    if (!voice) return ok({ attachment });
    const { transcript } = await transcribeAudioWithGemini(
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
    return ok({ attachment, transcript: transcript ?? "" });
  } catch (error) {
    return handleError(error, "chat upload");
  }
}
