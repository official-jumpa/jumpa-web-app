import { put, createFolder } from "@vercy/storage";
import type { ChatAttachment } from "@/lib/chat-attachments";
import { MAX_ATTACHMENT_BYTES } from "@/lib/chat-attachments";
import { connectDB } from "@/lib/db";
import { ChatLog } from "@/models/ChatLog";
import { generateId } from "@/lib/schema-ids";

/**
 * Stores one upload to Vercy Storage and returns attachment details.
 */
export async function saveChatAttachment(
  userId: string,
  file: File,
): Promise<ChatAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("Attachment is too large");
  }

  // 1. Ensure folder exists in Vercy Storage
  try {
    await createFolder("chat");
  } catch {
    // folder may already exist
  }

  // 2. Upload file buffer to Vercy Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await put(file.name || "attachment.png", buffer, {
    folder: "chat",
    contentType: file.type || "application/octet-stream",
  });

  const attachmentId = generateId("att");
  const mime = file.type || "application/octet-stream";

  return {
    id: attachmentId,
    url: uploaded.url,
    name: file.name || "attachment",
    mime,
    size: buffer.length,
  };
}

/**
 * Resolves attachment IDs scoped to their owner by looking inside the user's message logs.
 */
export async function getChatAttachments(
  userId: string,
  ids: string[],
): Promise<ChatAttachment[]> {
  if (!ids.length) return [];

  await connectDB();
  const idSet = new Set(ids);
  const found: ChatAttachment[] = [];

  // Find chat logs for this user that contain these attachment IDs
  const logs = await ChatLog.find({
    userId,
    "messages.attachments.id": { $in: ids },
  }).lean();

  for (const log of logs) {
    for (const msg of log.messages || []) {
      for (const att of msg.attachments || []) {
        if (idSet.has(att.id)) {
          found.push(att);
          idSet.delete(att.id);
        }
      }
    }
  }

  return found;
}

/**
 * The bytes behind one attachment, fetched via Vercy CDN if resolved for this user.
 */
export async function readChatAttachment(userId: string, id: string) {
  await connectDB();

  const log = await ChatLog.findOne({
    userId,
    "messages.attachments.id": id,
  }).lean();

  if (!log) return null;

  let matchedAtt: ChatAttachment | null = null;
  for (const msg of log.messages || []) {
    const att = (msg.attachments || []).find((a: any) => a.id === id);
    if (att) {
      matchedAtt = att;
      break;
    }
  }

  if (!matchedAtt?.url) return null;

  const res = await fetch(matchedAtt.url);
  if (!res.ok) return null;
  const arrayBuffer = await res.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    name: matchedAtt.name,
    mime: matchedAtt.mime,
  };
}

