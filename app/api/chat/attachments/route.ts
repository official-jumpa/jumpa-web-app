import { type NextRequest, NextResponse } from "next/server";
import { formatFileSize, MAX_ATTACHMENT_BYTES } from "@/lib/chat-attachments";
import { saveChatAttachment } from "@/lib/functions/chatAttachmentFunctions";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";

/**
 * POST /api/chat/attachments
 * One file from the composer's picker, stored against its owner. The composer
 * uploads on pick, so by the time the message is sent the id already exists.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveUser();
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
