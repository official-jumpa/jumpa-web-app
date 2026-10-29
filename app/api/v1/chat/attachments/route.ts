import { type NextRequest, NextResponse } from "next/server";
import {
  formatFileSize,
  isImageAttachment,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/chat-attachments";
import {
  readChatAttachment,
  saveChatAttachment,
  deleteChatAttachment,
} from "@/lib/functions/chatAttachmentFunctions";
import { transcribeAudioWithGemini } from "@/lib/ai/audio";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

function isInline(mime: string) {
  return isImageAttachment(mime) && mime !== "image/svg+xml";
}

/**
 * GET /api/v1/chat/attachments?id=<attachmentId>
 * Streams or downloads an attachment file
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "low", action: "chat_attachments_get" },
    });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Attachment ID is required (?id=...)" },
        { status: 400 },
      );
    }

    const file = await readChatAttachment(userId, id);
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const inline = isInline(file.mime);
    const name = file.name.replace(/"/g, "");

    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": inline ? file.mime : "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
        "Content-Length": String(file.buffer.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    console.error(`[Chat] Attachment read error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: "Could not load that file" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/v1/chat/attachments[?mode=voice]
 * Handles both file uploads and voice audio uploads + Gemini transcriptions.
 */
export async function POST(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode")?.toLowerCase();
  const isVoice = mode === "voice" || mode === "audio";

  try {
    const auth = await requireActiveUser({
      rateLimit: {
        tier: isVoice ? "high" : "medium",
        action: isVoice ? "chat_voice_upload" : "chat_attachments_upload",
      },
    });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: isVoice ? "No voice audio was provided" : "No file was sent" },
        { status: 400 },
      );
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json(
        {
          error: `File is larger than ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`,
        },
        { status: 413 },
      );
    }

    // 1. Upload file/audio to Vercy Storage
    const attachment = await saveChatAttachment(userId, file);

    // 2. If voice mode, transcribe with Gemini Flash (timeout-guarded at 20s)
    if (isVoice) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mime = file.type || "audio/webm";
      const transcription = await transcribeAudioWithGemini(buffer, mime);

      console.log(`[Chat] Uploaded voice note: ${attachment.name} (${formatFileSize(file.size)}) transcribed=${transcription.success}`);

      return NextResponse.json({
        success: true,
        data: {
          attachment,
          transcript: transcription.transcript || "",
          transcriptionSuccess: transcription.success,
        },
      });
    }

    console.log(`[Chat] Uploaded attachment: ${attachment.name} (${formatFileSize(file.size)})`);

    return NextResponse.json({
      success: true,
      data: {
        attachment,
      },
    });
  } catch (err: any) {
    console.error(`[Chat] Attachment upload error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: isVoice ? "Could not process voice recording" : "Could not upload file" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/v1/chat/attachments?url=<encodedUrl>
 * Purges an uploaded attachment or discarded voice recording from storage.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "low", action: "chat_attachment_delete" },
    });
    if (!auth.ok) return auth.response;

    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json(
        { error: "Attachment URL is required (?url=...)" },
        { status: 400 },
      );
    }

    const deleted = await deleteChatAttachment(url);
    console.log(`[Chat] Deleted attachment: ${url} (success: ${deleted})`);

    return NextResponse.json({
      success: true,
      data: {
        deleted,
      },
    });
  } catch (err: any) {
    console.error(`[Chat] Attachment delete error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: err?.message || "Could not delete attachment" },
      { status: 500 },
    );
  }
}
