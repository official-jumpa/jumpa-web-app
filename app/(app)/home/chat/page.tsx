import type { Metadata } from "next";
import { ChatView } from "@/components/chat/chat-view";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import {
  listRecentChatSessions,
  getLatestChatLog,
  getChatLogById,
} from "@/lib/functions/chatFunctions";

export const metadata: Metadata = { title: "Chat" };

interface ChatPageProps {
  searchParams: Promise<{ sessionId?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const { sessionId } = await searchParams;

  let initialSessions: any[] = [];
  let initialActiveSessionId: string | null = null;
  let initialMessages: any[] = [];
  let initialTotalMessagesCount = 0;

  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      const userId = session.user.id;

      const [recentSessions, targetChatLog] = await Promise.all([
        listRecentChatSessions(userId, 10),
        sessionId
          ? getChatLogById(sessionId, userId)
          : getLatestChatLog(userId),
      ]);

      initialSessions = recentSessions.map((c: any) => ({
        sessionId: String(c.sessionId || c._id),
        title: c.title || "New Chat",
        updatedAt:
          c.updatedAt instanceof Date
            ? c.updatedAt.toISOString()
            : String(c.updatedAt),
        messageCount: c.messageCount || 0,
      }));

      if (targetChatLog) {
        initialActiveSessionId = String(targetChatLog._id);
        const allMsgs = targetChatLog.messages || [];
        initialTotalMessagesCount = allMsgs.length;
        // Keep last 15 messages for fast initial hydration
        initialMessages = allMsgs.slice(-15).map((m: any) => ({
          ...JSON.parse(JSON.stringify(m)),
          timestamp:
            m.timestamp instanceof Date
              ? m.timestamp.toISOString()
              : m.timestamp,
        }));
      }
    }
  } catch (err) {
    console.warn("[ChatPage SSR] Prefetch fallback:", err);
  }

  return (
    <ChatView
      initialSessions={initialSessions}
      initialActiveSessionId={initialActiveSessionId}
      initialMessages={initialMessages}
      initialTotalMessagesCount={initialTotalMessagesCount}
    />
  );
}
