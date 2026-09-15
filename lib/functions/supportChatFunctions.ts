import { connectDB } from "@/lib/db";
import {
  SupportChatLog,
  type ISupportChatLog,
  type ISupportChatMessage,
} from "@/models/SupportChatLog";

/**
 * Loads or initializes an active support chat session strictly scoped to the userId.
 */
export async function getOrCreateSupportChatLog(
  userId: string,
): Promise<ISupportChatLog> {
  await connectDB();

  const existing = await SupportChatLog.findOne({
    userId,
    status: "open",
  }).sort({ updatedAt: -1 });

  if (existing) return existing;

  const newLog = await SupportChatLog.create({
    userId,
    status: "open",
    messages: [],
  });

  return newLog;
}

/**
 * Retrieves the messages of the active support chat session for the user.
 */
export async function getSupportChatMessages(
  userId: string,
): Promise<ISupportChatMessage[]> {
  await connectDB();

  const log = await SupportChatLog.findOne({
    userId,
    status: "open",
  })
    .sort({ updatedAt: -1 })
    .select("messages")
    .lean<ISupportChatLog>();

  return log?.messages || [];
}

/**
 * Appends a message to the active support chat session.
 */
export async function appendSupportChatMessage(params: {
  userId: string;
  message: ISupportChatMessage;
}): Promise<void> {
  await connectDB();

  const activeLog = await getOrCreateSupportChatLog(params.userId);

  await SupportChatLog.updateOne(
    { _id: activeLog._id },
    {
      $push: { messages: params.message },
      $set: { updatedAt: new Date() },
    },
  );
}

/**
 * Appends multiple messages (e.g. user turn and assistant reply) to the active support chat.
 */
export async function appendSupportChatMessages(params: {
  userId: string;
  messages: ISupportChatMessage[];
}): Promise<void> {
  if (!params.messages.length) return;
  await connectDB();

  const activeLog = await getOrCreateSupportChatLog(params.userId);

  await SupportChatLog.updateOne(
    { _id: activeLog._id },
    {
      $push: { messages: { $each: params.messages } },
      $set: { updatedAt: new Date() },
    },
  );
}
