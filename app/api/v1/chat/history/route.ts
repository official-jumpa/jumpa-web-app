import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  listRecentChatSessions,
  getLatestChatLog,
  getChatLogById,
  deleteChatSession,
  updateChatLogMessages,
} from "@/lib/functions/chatFunctions";
import { findConfirmedTransactionsByReferences } from "@/lib/functions/transactionFunctions";
import {
  chatHistoryQuerySchema,
  deleteChatSessionQuerySchema,
} from "@/lib/validations/chat.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * Cross-references pending onramp messages in the DB. If settled, updates cardData.status = "confirmed"
 */
async function syncMessagesWithSettledTransactions(
  chatId: string,
  messages: any[],
  userId: string,
): Promise<any[]> {
  if (!messages || messages.length === 0) return messages;

  const pendingOnramps = messages.filter(
    (m) =>
      m.cardType === "onramp" &&
      m.cardData?.reference &&
      m.cardData.status !== "confirmed" &&
      m.cardData.status !== "completed",
  );

  if (pendingOnramps.length === 0) return messages;

  const references = pendingOnramps.map((m) => m.cardData.reference);

  try {
    const confirmedTxs = await findConfirmedTransactionsByReferences(
      userId,
      references,
    );

    if (confirmedTxs.length === 0) return messages;

    const confirmedRefs = new Set<string>();
    for (const t of confirmedTxs) {
      if (t.rampDetails?.reference) confirmedRefs.add(t.rampDetails.reference);
      if (t.txHash) confirmedRefs.add(t.txHash);
    }

    let hasUpdates = false;
    for (const m of messages) {
      if (
        m.cardType === "onramp" &&
        m.cardData?.reference &&
        confirmedRefs.has(m.cardData.reference)
      ) {
        m.cardData.status = "confirmed";
        m.status = "confirmed";
        hasUpdates = true;
      }
    }

    if (hasUpdates && chatId) {
      updateChatLogMessages(chatId, userId, messages).catch((err) =>
        console.warn(
          `[Chat] History sync notice: ${formatOneLineError(err)}`,
        ),
      );
    }
  } catch (err) {
    console.warn(`[Chat] Notice checking settled transactions: ${formatOneLineError(err)}`);
  }

  return messages;
}

/**
 * GET /api/v1/chat/history?list=true | latest=true | sessionId=... [&all=true]
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "low", action: "chat_history_get" },
    });
    if (!auth.ok) return auth.response;

    const userId = auth.session.user.id;
    const { searchParams } = new URL(req.url);

    const validation = chatHistoryQuerySchema.safeParse({
      sessionId: searchParams.get("sessionId") || undefined,
      latest: searchParams.get("latest") || undefined,
      list: searchParams.get("list") || undefined,
      all: searchParams.get("all") || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { sessionId, latest, list, all } = validation.data;
    const isList = list === true || list === "true";
    const isLatest = latest === true || latest === "true";
    const loadAll = all === true || all === "true";

    // 1. Return recent sessions summary list
    if (isList) {
      const sessions = await listRecentChatSessions(userId, 10);
      return NextResponse.json({
        success: true,
        data: { sessions },
      });
    }

    // 2. Return latest session
    if (isLatest) {
      const latestChat = await getLatestChatLog(userId);
      if (!latestChat) {
        return NextResponse.json({
          success: true,
          data: { session: null },
        });
      }

      const totalCount = latestChat.messages?.length || 0;
      const rawMessages = loadAll
        ? latestChat.messages || []
        : (latestChat.messages || []).slice(-20);

      const returnedMessages = await syncMessagesWithSettledTransactions(
        latestChat._id,
        rawMessages,
        userId,
      );

      return NextResponse.json({
        success: true,
        data: {
          session: {
            sessionId: latestChat._id,
            title: latestChat.title || "New Chat",
            messages: returnedMessages,
            totalMessages: totalCount,
            updatedAt: latestChat.updatedAt,
          },
        },
      });
    }

    // 3. Return specific session by ID
    if (sessionId) {
      const chatLog = await getChatLogById(sessionId, userId);
      if (!chatLog) {
        return NextResponse.json(
          { error: "Chat session not found" },
          { status: 404 },
        );
      }

      const totalCount = chatLog.messages?.length || 0;
      const rawMessages = loadAll
        ? chatLog.messages || []
        : (chatLog.messages || []).slice(-12);

      const returnedMessages = await syncMessagesWithSettledTransactions(
        chatLog._id,
        rawMessages,
        userId,
      );

      return NextResponse.json({
        success: true,
        data: {
          session: {
            sessionId: chatLog._id,
            title: chatLog.title || "New Chat",
            messages: returnedMessages,
            totalMessages: totalCount,
            updatedAt: chatLog.updatedAt,
          },
        },
      });
    }

    // Default fallback: Return list of 10 recent sessions
    const sessions = await listRecentChatSessions(userId, 10);
    return NextResponse.json({
      success: true,
      data: { sessions },
    });
  } catch (err: any) {
    console.error(`[Chat] History GET error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/v1/chat/history?sessionId=...
 * Deletes a chat session permanently from the database.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "medium", action: "chat_history_delete" },
    });
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const validation = deleteChatSessionQuerySchema.safeParse({
      sessionId: searchParams.get("sessionId") || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { sessionId } = validation.data;
    await deleteChatSession(sessionId, auth.session.user.id);

    console.log(`[Chat] Deleted session: ${sessionId}`);

    return NextResponse.json({
      success: true,
      data: { sessionId },
    });
  } catch (err: any) {
    console.error(`[Chat] History DELETE error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: "Failed to delete chat session" },
      { status: 500 },
    );
  }
}
