import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/functions/permissionFunctions";
import {
  getSupportChatMessages,
  appendSupportChatMessages,
} from "@/lib/functions/supportChatFunctions";
import {
  runSupportAgentCompletion,
  type SupportChatMessage,
} from "@/lib/ai/support-agent";
import { describeAttachments } from "@/lib/chat-attachments";
import { generateId } from "@/lib/schema-ids";
import type { ISupportChatMessage } from "@/models/SupportChatLog";
import { formatZodError } from "@/lib/validations/validation-helper";

const supportSendSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(3000),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        name: z.string(),
        mime: z.string(),
        size: z.number(),
      }),
    )
    .optional()
    .default([]),
});

/**
 * GET /api/support-agent
 * Fetches the user's persistent support chat transcript.
 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const messages = await getSupportChatMessages(auth.userId);
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[SupportAgent GET Error]", err);
    return NextResponse.json(
      { error: "Could not load support messages." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/support-agent
 * Sends a message to the Jumpa AI support specialist and returns the assistant's reply.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const validation = supportSendSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(formatZodError(validation.error), { status: 400 });
  }

  const { message, attachments } = validation.data;
  const userId = auth.userId;
  const user = auth.user;

  try {
    // 1. Fetch recent message history to provide conversational context
    const previousMessages = await getSupportChatMessages(userId);

    // 2. Format history for the AI prompt (last 10 messages)
    const historyForAi: SupportChatMessage[] = previousMessages
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    // Append current user message content (including any attachment descriptions)
    const attachmentNote = describeAttachments(attachments as any);
    const userTurnText = [message, attachmentNote].filter(Boolean).join("\n\n");

    historyForAi.push({
      role: "user",
      content: userTurnText,
    });

    // 3. Request AI completion with Jumpa Support context
    const reply = await runSupportAgentCompletion(historyForAi, {
      userName: user?.name,
      jumpaTag: user?.jumpaTag,
      email: user?.email,
    });

    // 4. Create persistent message records
    const now = new Date();
    const userRecord: ISupportChatMessage = {
      id: generateId("msg"),
      role: "user",
      content: message,
      ...(attachments.length ? { attachments } : {}),
      timestamp: now,
    };

    const assistantRecord: ISupportChatMessage = {
      id: generateId("msg"),
      role: "assistant",
      content: reply,
      timestamp: new Date(now.getTime() + 100),
    };

    // 5. Persist to dedicated SupportChatLog collection
    await appendSupportChatMessages({
      userId,
      messages: [userRecord, assistantRecord],
    });

    return NextResponse.json({
      reply,
      userMessageId: userRecord.id,
      assistantMessageId: assistantRecord.id,
    });
  } catch (err) {
    console.error("[SupportAgent POST Error]", err);
    return NextResponse.json(
      {
        error:
          "Our support assistant is having trouble connecting. Please try again or email support@usejumpa.com.",
      },
      { status: 500 },
    );
  }
}
