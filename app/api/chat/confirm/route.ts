import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { generateId } from "@/lib/schema-ids";
import { ChatLog, type IChatMessage } from "@/models/ChatLog";
import { Wallet } from "@/models/Wallet";
import bcrypt from "bcryptjs";

const WALLET_PIN_REGEX = /^\d{6}$/;

/**
 * POST /api/chat/confirm
 * Body: { sessionId: string, messageId?: string, pin: string, updatedCardData?: any, updatedParams?: any }
 * mock data for now
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
    const { sessionId, messageId, pin, updatedCardData, updatedParams } =
      body as {
        sessionId?: string;
        messageId?: string;
        pin?: string;
        updatedCardData?: Record<string, any>;
        updatedParams?: Record<string, any>;
      };

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }

    if (!pin || !WALLET_PIN_REGEX.test(pin)) {
      return NextResponse.json(
        { error: "Valid PIN required" },
        { status: 400 },
      );
    }

    await connectDB();
    const userId = session.user.id;

    // Verify PIN against user's wallet if exists
    const wallet = await Wallet.findOne({ userId });
    if (wallet?.pinHash) {
      const pinValid = await bcrypt.compare(pin, wallet.pinHash);
      if (!pinValid) {
        return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
      }
    }

    const chatLog = await ChatLog.findOne({ _id: sessionId, userId });
    if (!chatLog) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 },
      );
    }

    // Find the target action message
    const targetMsg = messageId
      ? chatLog.messages.find((m) => m.id === messageId)
      : chatLog.messages.find((m) => m.isTransaction && m.status === "pending");

    if (targetMsg) {
      targetMsg.status = "confirmed";
      if (updatedCardData) {
        targetMsg.cardData = { ...targetMsg.cardData, ...updatedCardData };
      }
      if (updatedParams) {
        targetMsg.transactionParams = {
          ...targetMsg.transactionParams,
          ...updatedParams,
        };
      }
    }

    const cardType = targetMsg?.cardType || "quote";

    // User authorization message
    const userAuthMsg: IChatMessage = {
      id: generateId("MSG"),
      role: "user",
      content: cardType === "quote" ? "Swap authorised" : "Transfer authorised",
      timestamp: new Date(),
    };

    const effectiveCardData = updatedCardData || targetMsg?.cardData;

    let receiptCardData: any;

    if (cardType === "quote") {
      const receiveVal = effectiveCardData?.receive?.value || "115.4";
      const receiveBadge = effectiveCardData?.receive?.badge || "XLM";
      const payBadge = effectiveCardData?.pay?.badge || "USD";

      receiptCardData = {
        title: "Swapped",
        status: "Successful",
        balance: {
          caption: "BALANCE",
          value: receiveVal,
          badge: receiveBadge,
        },
        stats: [
          { value: `+ ${receiveVal} ${receiveBadge}` },
          { lead: "Fee ", value: `0.01 ${payBadge === "XLM" ? "XLM" : "USD"}` },
        ],
      };
    } else {
      receiptCardData = {
        title: "Sent",
        status: "Successful",
        balance: {
          caption: "BALANCE",
          value: "400.50",
          badge: "USD",
        },
        stats: [{ value: "- 50.00 USD" }, { lead: "Fee ", value: "0.01 XLM" }],
      };
    }

    // Assistant receipt message
    const receiptMsg: IChatMessage = {
      id: generateId("MSG"),
      role: "assistant",
      content:
        cardType === "quote"
          ? "✓ Swap confirmed in 1.4 seconds"
          : "✓ Transfer sent successfully in 2.1 seconds",
      isTransaction: true,
      cardType: "receipt",
      status: "confirmed",
      cardData: receiptCardData,
      timestamp: new Date(),
    };

    chatLog.messages.push(userAuthMsg);
    chatLog.messages.push(receiptMsg);

    await chatLog.save();

    return NextResponse.json({
      success: true,
      userAuthMsg,
      receiptMsg,
      messages: chatLog.messages.slice(-12),
    });
  } catch (err) {
    console.error("[Chat Confirm POST Error]", err);
    return NextResponse.json(
      { error: "Failed to confirm transaction" },
      { status: 500 },
    );
  }
}
