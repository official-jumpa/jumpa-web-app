import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { cancelPendingChatMessage } from "@/lib/functions/chatFunctions";
import { cancelChatActionSchema } from "@/lib/validations/chat.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * POST /api/chat/cancel
 * Body: { sessionId: string, messageId?: string }
 * Cancels a pending transaction card (quote, transfer, offramp).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = cancelChatActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { sessionId, messageId } = validation.data;

    const result = await cancelPendingChatMessage({
      sessionId,
      userId: session.user.id,
      messageId,
    });

    if (!result.success) {
      const status = result.error?.includes("not found") ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

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
