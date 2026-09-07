import { connectDB } from "@/lib/db";
import { ChatLog, type IChatLog, type IChatMessage } from "@/models/ChatLog";
import { Transaction } from "@/models/Transaction";
import { generateId } from "@/lib/schema-ids";

/**
 * Loads or initializes a chat session strictly scoped to the userId.
 */
export async function getOrCreateChatLog(params: {
  userId: string;
  sessionId?: string;
  walletAddress?: string;
}): Promise<any> {
  await connectDB();

  if (params.sessionId) {
    const existing = await ChatLog.findOne({
      _id: params.sessionId,
      userId: params.userId,
    });
    if (existing) return existing;
  }

  const newLog = await ChatLog.create({
    userId: params.userId,
    walletAddress: params.walletAddress || "",
    type: "personal",
    title: "New Chat",
    messages: [],
  });

  return newLog;
}

/**
 * Retrieves a chat log by ID for the user.
 */
export async function getChatLogById(
  sessionId: string,
  userId: string,
): Promise<any> {
  await connectDB();
  return ChatLog.findOne({ _id: sessionId, userId });
}

/**
 * Retrieves the most recent chat log for the user.
 */
export async function getLatestChatLog(
  userId: string,
): Promise<any> {
  await connectDB();
  return ChatLog.findOne({ userId }).sort({ updatedAt: -1 });
}


/**
 * Lists summary metadata for recent chat sessions.
 */
export async function listRecentChatSessions(
  userId: string,
  limit = 10,
): Promise<any[]> {
  await connectDB();
  const logs = await ChatLog.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select("_id title updatedAt messages")
    .lean();

  return logs.map((c: any) => ({
    sessionId: c._id,
    title: c.title || "New Chat",
    updatedAt: c.updatedAt,
    messageCount: c.messages?.length || 0,
  }));
}

/**
 * Deletes a chat session permanently.
 */
export async function deleteChatSession(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  await connectDB();
  const res = await ChatLog.deleteOne({ _id: sessionId, userId });
  return res.deletedCount > 0;
}

/**
 * Cancels a pending transaction message inside a chat session.
 */
export async function cancelPendingChatMessage(params: {
  sessionId: string;
  userId: string;
  messageId?: string;
}): Promise<{
  success: boolean;
  cancelledMessageId?: string;
  assistantMessage?: IChatMessage;
  error?: string;
}> {
  await connectDB();

  const chatLog = await ChatLog.findOne({
    _id: params.sessionId,
    userId: params.userId,
  });

  if (!chatLog) {
    return { success: false, error: "Chat session not found" };
  }

  let targetMsg: IChatMessage | undefined;
  if (params.messageId) {
    targetMsg = chatLog.messages.find(
      (m: IChatMessage) => m.id === params.messageId && m.status === "pending",
    );
  }

  if (!targetMsg) {
    targetMsg = [...chatLog.messages]
      .reverse()
      .find((m: IChatMessage) => m.isTransaction && m.status === "pending");
  }

  if (!targetMsg) {
    return { success: false, error: "No pending transaction found to cancel" };
  }

  targetMsg.status = "cancelled";
  if (targetMsg.cardData) {
    targetMsg.cardData.status = "cancelled";
  }

  const reference =
    targetMsg.cardData?.reference ||
    targetMsg.transactionParams?.reference ||
    targetMsg.id;

  if (reference) {
    await Transaction.updateOne(
      { $or: [{ txHash: reference }, { messageId: targetMsg.id }] },
      { $set: { status: "CANCELLED" } },
    ).catch(() => {});
  }

  const cancelMsg: IChatMessage = {
    id: generateId("msg"),
    role: "assistant",
    content: "Transaction cancelled.",
    timestamp: new Date(),
  };

  chatLog.messages.push(cancelMsg);
  await chatLog.save();

  return {
    success: true,
    cancelledMessageId: targetMsg.id,
    assistantMessage: cancelMsg,
  };
}
