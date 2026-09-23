import { type NextRequest, NextResponse } from "next/server";
import {
  formatFileSize,
  isImageAttachment,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/chat-attachments";
import {
  readChatAttachment,
  saveChatAttachment,
} from "@/lib/functions/chatAttachmentFunctions";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";

/** An SVG opened in a tab can run script on our origin, so it never goes inline. */
function isInline(mime: string) {
  return isImageAttachment(mime) && mime !== "image/svg+xml";
}

/**
 * GET /api/chat/attachments?id=<attachmentId>
 * Streams or downloads an attachment file scoped to the authenticated user.
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
  } catch (err) {
    console.error("[Chat Attachment Read Error]", err);
    return NextResponse.json(
      { error: "Could not load that file" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/chat/attachments
 * One file from the composer's picker, stored against its owner. The composer
 * uploads on pick, so by the time the message is sent the id already exists.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "medium", action: "chat_attachments_upload" },
    });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file was sent" }, { status: 400 });
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json(
        {
          error: `That file is larger than ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`,
        },
        { status: 413 },
      );
    }

    const attachment = await saveChatAttachment(userId, file);
    return NextResponse.json({ attachment });
  } catch (err) {
    console.error("[Chat Attachment Upload Error]", err);
    return NextResponse.json(
      { error: "Could not upload that file" },
      { status: 500 },
    );
  }
}
