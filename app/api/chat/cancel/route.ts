import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ChatLog, type IChatMessage } from "@/models/ChatLog";
import { Transaction } from "@/models/Transaction";
import { generateId } from "@/lib/schema-ids";

/**
 * POST /api/chat/cancel
 * Body: { sessionId: string, messageId?: string }
 *
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

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));
    const { sessionId, messageId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const chatLog = await ChatLog.findOne({ sessionId, userId });
    if (!chatLog) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 },
      );
    }

    // Find the target pending message
    let targetMsg: IChatMessage | undefined;
    if (messageId) {
      targetMsg = chatLog.messages.find(
        (m: IChatMessage) => m.id === messageId && m.status === "pending",
      );
    }

    if (!targetMsg) {
      targetMsg = [...chatLog.messages]
        .reverse()
        .find(
          (m: IChatMessage) => m.isTransaction && m.status === "pending",
        );
    }

    if (!targetMsg) {
      return NextResponse.json(
        { error: "No pending transaction found to cancel" },
        { status: 400 },
      );
    }

    targetMsg.status = "cancelled";
    if (targetMsg.cardData) {
      targetMsg.cardData.status = "cancelled";
    }

    // If there is an associated pending transaction in DB, update it
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

    // Append cancellation notification message
    const cancelMsg: IChatMessage = {
      id: generateId("MSG"),
      role: "assistant",
      content: "Transaction cancelled.",
      timestamp: new Date(),
    };

    chatLog.messages.push(cancelMsg);
    await chatLog.save();

    console.log(
      `[Chat Cancel] [User: ${userId}] Successfully cancelled pending message: ${targetMsg.id}`,
    );

    return NextResponse.json({
      success: true,
      cancelledMessageId: targetMsg.id,
      assistantMessage: cancelMsg,
    });
  } catch (error: any) {
    console.error("[Chat Cancel] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
