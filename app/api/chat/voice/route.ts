import { type NextRequest, NextResponse } from "next/server";
import { formatFileSize, MAX_ATTACHMENT_BYTES } from "@/lib/chat-attachments";
import {
  deleteChatAttachment,
  saveChatAttachment,
} from "@/lib/functions/chatAttachmentFunctions";
import { transcribeAudioWithGemini } from "@/lib/ai/audio";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";

/**
 * POST /api/chat/voice
 * Uploads a voice recording to Vercy Storage and transcribes it with Gemini 2.5 Flash.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "high", action: "chat_voice_upload" },
    });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "No voice audio was provided" },
        { status: 400 },
      );
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json(
        {
          error: `Audio file is larger than ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`,
        },
        { status: 413 },
      );
    }

    // 1. Upload to Vercy Storage
    const attachment = await saveChatAttachment(userId, file);

    // 2. Transcribe with Gemini 2.5 Flash
    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "audio/webm";
    const transcription = await transcribeAudioWithGemini(buffer, mime);

    return NextResponse.json({
      attachment,
      transcript: transcription.transcript || "",
      transcriptionSuccess: transcription.success,
    });
  } catch (err: any) {
    console.error("[Chat Voice Upload Error]", err);
    return NextResponse.json(
      { error: err?.message || "Could not process voice recording" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/chat/voice?url=<encodedUrl>
 * Purges an uploaded voice recording from Vercy Storage when discarded by the user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "low", action: "chat_voice_delete" },
    });
    if (!auth.ok) return auth.response;

    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json(
        { error: "Voice recording URL is required (?url=...)" },
        { status: 400 },
      );
    }

    const deleted = await deleteChatAttachment(url);
    return NextResponse.json({
      ok: true,
      deleted,
    });
  } catch (err: any) {
    console.error("[Chat Voice Delete Error]", err);
    return NextResponse.json(
      { error: err?.message || "Could not delete voice recording" },
      { status: 500 },
    );
  }
}
