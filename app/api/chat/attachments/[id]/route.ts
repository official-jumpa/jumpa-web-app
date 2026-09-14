import { NextResponse } from "next/server";
import { isImageAttachment } from "@/lib/chat-attachments";
import { readChatAttachment } from "@/lib/functions/chatAttachmentFunctions";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";

/** An SVG opened in a tab can run script on our origin, so it never goes inline. */
function isInline(mime: string) {
  return isImageAttachment(mime) && mime !== "image/svg+xml";
}

/**
 * GET /api/chat/attachments/[id]
 * The file behind one attachment, readable only by the user who uploaded it.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireActiveUser();
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const { id } = await params;
    const file = await readChatAttachment(userId, id);
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const inline = isInline(file.mime);
    const name = file.name.replace(/"/g, "");

    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        // Anything we will not render is handed over as a download instead.
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
