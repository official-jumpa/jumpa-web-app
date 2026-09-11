import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { formatFileSize, MAX_ATTACHMENT_BYTES } from "@/lib/chat-attachments";
import { saveChatAttachment } from "@/lib/functions/chatAttachmentFunctions";

/**
 * POST /api/chat/attachments
 * One file from the composer's picker, stored against its owner. The composer
 * uploads on pick, so by the time the message is sent the id already exists.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const attachment = await saveChatAttachment(session.user.id, file);
    return NextResponse.json({ attachment });
  } catch (err) {
    console.error("[Chat Attachment Upload Error]", err);
    return NextResponse.json(
      { error: "Could not upload that file" },
      { status: 500 },
    );
  }
}
