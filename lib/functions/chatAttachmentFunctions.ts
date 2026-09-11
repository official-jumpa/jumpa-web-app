import { GridFSBucket, type GridFSFile, ObjectId } from "mongodb";
import type { ChatAttachment } from "@/lib/chat-attachments";
import { MAX_ATTACHMENT_BYTES } from "@/lib/chat-attachments";
import { connectDB, getDb } from "@/lib/db";

/**
 * Chat attachments live in GridFS on the app's own database — there is no blob
 * store, and a file this size does not belong inline in a chat document.
 */
const BUCKET = "chatAttachments";

type AttachmentMetadata = { userId: string; mime: string };

async function bucket() {
  await connectDB();
  return new GridFSBucket(getDb(), { bucketName: BUCKET });
}

/** GridFS ids are ObjectIds; anything else is a caller's typo, not a lookup. */
function toObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function toAttachment(file: GridFSFile): ChatAttachment {
  const id = file._id.toHexString();
  return {
    id,
    url: `/api/chat/attachments/${id}`,
    name: file.filename,
    mime: file.metadata?.mime || "application/octet-stream",
    size: file.length,
  };
}

/** Stores one upload against its owner and hands back the row a message keeps. */
export async function saveChatAttachment(
  userId: string,
  file: File,
): Promise<ChatAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("Attachment is too large");
  }

  const files = await bucket();
  const buffer = Buffer.from(await file.arrayBuffer());
  const metadata: AttachmentMetadata = {
    userId,
    mime: file.type || "application/octet-stream",
  };

  const upload = files.openUploadStream(file.name || "attachment", {
    metadata,
  });
  await new Promise<void>((resolve, reject) => {
    upload.on("error", reject);
    upload.on("finish", () => resolve());
    upload.end(buffer);
  });

  return {
    id: upload.id.toHexString(),
    url: `/api/chat/attachments/${upload.id.toHexString()}`,
    name: file.name || "attachment",
    mime: metadata.mime,
    size: buffer.length,
  };
}

/**
 * Resolves ids the client sent back into stored rows, scoped to their owner —
 * so a message can only ever carry a file this user actually uploaded, and its
 * name, type and size come from us rather than from the request body.
 */
export async function getChatAttachments(
  userId: string,
  ids: string[],
): Promise<ChatAttachment[]> {
  const objectIds = ids.map(toObjectId).filter((id) => id !== null);
  if (!objectIds.length) return [];

  const files = await bucket();
  const found = await files
    .find({ _id: { $in: objectIds }, "metadata.userId": userId })
    .toArray();

  // Keep the order the user picked them in, which find() does not promise.
  const byId = new Map(found.map((file) => [file._id.toHexString(), file]));
  return ids.flatMap((id) => {
    const file = byId.get(id);
    return file ? [toAttachment(file)] : [];
  });
}

/** The bytes behind one attachment, or null when it is not this user's. */
export async function readChatAttachment(userId: string, id: string) {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const files = await bucket();
  const file = await files
    .find({ _id: objectId, "metadata.userId": userId })
    .next();
  if (!file) return null;

  const chunks: Buffer[] = [];
  for await (const chunk of files.openDownloadStream(objectId)) {
    chunks.push(chunk as Buffer);
  }

  return {
    buffer: Buffer.concat(chunks),
    name: file.filename,
    mime: file.metadata?.mime || "application/octet-stream",
  };
}
