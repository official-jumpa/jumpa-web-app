import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  listRecentChatSessions,
  getLatestChatLog,
  getChatLogById,
  deleteChatSession,
} from "@/lib/functions/chatFunctions";
import { chatHistoryQuerySchema } from "@/lib/validations/chat.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * GET /api/chat/history
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
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
      return NextResponse.json({ sessions });
    }

    // 2. Return latest session
    if (isLatest) {
      const latestChat = await getLatestChatLog(userId);
      if (!latestChat) {
        return NextResponse.json({ session: null });
      }

      const totalCount = latestChat.messages?.length || 0;
      const returnedMessages = loadAll
        ? latestChat.messages || []
        : (latestChat.messages || []).slice(-12);

      return NextResponse.json({
        session: {
          sessionId: latestChat._id,
          title: latestChat.title || "New Chat",
          messages: returnedMessages,
          totalMessages: totalCount,
          updatedAt: latestChat.updatedAt,
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
      const returnedMessages = loadAll
        ? chatLog.messages || []
        : (chatLog.messages || []).slice(-12);

      return NextResponse.json({
        session: {
          sessionId: chatLog._id,
          title: chatLog.title || "New Chat",
          messages: returnedMessages,
          totalMessages: totalCount,
          updatedAt: chatLog.updatedAt,
        },
      });
    }

    // Default fallback: Return list of 10 recent sessions
    const sessions = await listRecentChatSessions(userId, 10);
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[Chat History Error]", err);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/chat/history?sessionId=...
 * Deletes a chat session permanently from the database.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    await deleteChatSession(sessionId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Chat History Error]", err);
    return NextResponse.json(
      { error: "Failed to delete chat session" },
      { status: 500 },
    );
  }
}
