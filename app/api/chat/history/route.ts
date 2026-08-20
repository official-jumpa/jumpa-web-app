import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ChatLog } from "@/models/ChatLog";

/**
 * GET /api/chat/history
 *
 * Query options:
 * - ?sessionId=...  -> Returns the specific chat session with its 12 most recent messages (or all if ?all=true)
 * - ?latest=true     -> Returns the user's most recent chat session with its 12 most recent messages
 * - ?list=true       -> Returns a summary list of up to 10 most recent sessions
 * - ?all=true        -> Used with sessionId or latest to return all messages
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const isLatest = searchParams.get("latest") === "true";
    const isList = searchParams.get("list") === "true";
    const loadAll = searchParams.get("all") === "true";

    // 1. Return recent sessions summary list (max 10)
    if (isList) {
      const chatLogs = await ChatLog.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select("_id title updatedAt messages")
        .lean();

      const sessions = chatLogs.map((c: any) => ({
        sessionId: c._id,
        title: c.title || "New Chat",
        updatedAt: c.updatedAt,
        messageCount: c.messages?.length || 0,
      }));

      return NextResponse.json({ sessions });
    }

    // 2. Return latest session (if requested)
    if (isLatest) {
      const latestChat = await ChatLog.findOne({ userId })
        .sort({ updatedAt: -1 })
        .lean();

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
      const chatLog = await ChatLog.findOne({
        _id: sessionId,
        userId,
      }).lean();

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
    const chatLogs = await ChatLog.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("_id title updatedAt messages")
      .lean();

    const sessions = chatLogs.map((c: any) => ({
      sessionId: c._id,
      title: c.title || "New Chat",
      updatedAt: c.updatedAt,
      messageCount: c.messages?.length || 0,
    }));

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

    await connectDB();
    const userId = session.user.id;

    await ChatLog.deleteOne({ _id: sessionId, userId });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Chat History Error]", err);
    return NextResponse.json(
      { error: "Failed to delete chat session" },
      { status: 500 },
    );
  }
}
