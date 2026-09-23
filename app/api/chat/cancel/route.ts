import { NextRequest, NextResponse } from "next/server";
import { cancelPendingChatMessage } from "@/lib/functions/chatFunctions";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { cancelChatActionSchema } from "@/lib/validations/chat.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { logUserActivity } from "@/lib/functions/userFunctions";

/**
 * POST /api/chat/cancel
 * Body: { sessionId: string, messageId?: string }
 * Cancels a pending transaction card (quote, transfer, offramp).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "medium", action: "chat_cancel" },
    });
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const validation = cancelChatActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { sessionId, messageId } = validation.data;

    const result = await cancelPendingChatMessage({
      sessionId,
      userId: auth.userId,
      messageId,
    });

    if (!result.success) {
      const status = result.error?.includes("not found") ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    logUserActivity({
      userId: auth.userId,
      action: "CHAT_TRANSACTION_CANCELLED",
      details: {
        sessionId,
        messageId: result.cancelledMessageId,
      },
      req,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      cancelledMessageId: result.cancelledMessageId,
      assistantMessage: result.assistantMessage,
    });
  } catch (error: any) {
    console.error("[Chat Cancel] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
