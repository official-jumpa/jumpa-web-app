import { type NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { generateId } from "@/lib/schema-ids";
import {
  chatActionQuerySchema,
  confirmChatActionSchema,
  cancelChatActionSchema,
} from "@/lib/validations/chat.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { type IChatMessage } from "@/models/ChatLog";
import {
  getChatLogById,
  cancelPendingChatMessage,
} from "@/lib/functions/chatFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import {
  executeChatSwap,
  executeChatBridge,
  executeChatSavings,
  executeChatTransfer,
  executeChatOfframp,
  type ChatExecutionResult,
} from "@/lib/services/chat-execution";

/**
 * POST /api/v1/chat/action?action=confirm|cancel
 *
 * Unified endpoint for chat transaction lifecycle actions:
 * - action=cancel: Cancels a pending proposed action card.
 * - action=confirm: Verifies wallet PIN and executes the proposed DEX swap,
 *                   bridge, savings, transfer, or offramp transaction.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const searchParams = req.nextUrl.searchParams;
  const actionQueryValidation = chatActionQuerySchema.safeParse({
    action: searchParams.get("action") || undefined,
  });

  if (!actionQueryValidation.success) {
    return NextResponse.json(formatZodError(actionQueryValidation.error), {
      status: 400,
    });
  }

  const { action } = actionQueryValidation.data;

  // 1. CANCEL ACTION
  if (action === "cancel") {
    try {
      const auth = await requireActiveUser({
        rateLimit: { tier: "medium", action: "chat_cancel" },
      });
      if (!auth.ok) return auth.response;

      const body = await req.json().catch(() => ({}));
      const validation = cancelChatActionSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(formatZodError(validation.error), {
          status: 400,
        });
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

      console.log(`[Chat] Action cancelled: message ${result.cancelledMessageId || "latest"} in session ${sessionId}`);

      return NextResponse.json({
        success: true,
        data: {
          cancelledMessageId: result.cancelledMessageId,
          assistantMessage: result.assistantMessage,
        },
      });
    } catch (err: any) {
      console.error(`[Chat] Action cancel error: ${formatOneLineError(err)}`);
      return NextResponse.json(
        { error: err?.message || "Failed to cancel action" },
        { status: 500 },
      );
    }
  }

  // 2. CONFIRM ACTION
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "high", action: "chat_confirm" },
    });
    if (!auth.ok) return auth.response;
    const session = auth.session;
    const userId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const validation = confirmChatActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { sessionId, messageId, pin, updatedCardData, updatedParams } =
      validation.data;

    const wallet = await findWalletForUser(userId);
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const pinResult = await verifyWalletPin(wallet, pin, { userId, sessionId });
    if (!pinResult.ok) {
      return NextResponse.json(
        { error: pinResult.error },
        { status: pinResult.status },
      );
    }

    const chatLog = await getChatLogById(sessionId, userId);
    if (!chatLog) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 },
      );
    }

    // Find the target action message (always pick the latest pending if messageId not provided)
    const targetMsg = messageId
      ? chatLog.messages.find((m: IChatMessage) => m.id === messageId)
      : [...chatLog.messages]
          .reverse()
          .find((m: IChatMessage) => m.isTransaction && m.status === "pending");

    if (!targetMsg) {
      console.warn(`[Chat] No pending transaction found in session ${sessionId}`);
    }

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

      // Mark all other older pending transactions as cancelled/superseded
      for (const m of chatLog.messages) {
        if (
          m.isTransaction &&
          m.status === "pending" &&
          m.id !== targetMsg.id
        ) {
          m.status = "cancelled";
        }
      }
    }

    const cardType = targetMsg?.cardType || "quote";
    const effectiveCardData = updatedCardData || targetMsg?.cardData || {};
    const txParams = targetMsg?.transactionParams || {};

    // User authorization message
    const userAuthMsg: IChatMessage = {
      id: generateId("msg"),
      role: "user",
      content:
        cardType === "quote"
          ? "Swap approved"
          : cardType === "bridge"
            ? "Bridge authorised"
            : txParams?.type === "savings_create"
              ? "Savings goal confirmed"
              : txParams?.type === "savings_deposit"
                ? "Savings deposit approved"
                : txParams?.type === "savings_withdraw"
                  ? "Savings withdrawal approved"
                  : cardType === "offramp"
                    ? "Withdrawal approved"
                    : "Transfer approved",
      timestamp: new Date(),
    };

    // Execute transaction via modular chat execution service
    let executionResult: ChatExecutionResult;

    if (cardType === "quote") {
      executionResult = await executeChatSwap({
        wallet,
        pin,
        effectiveCardData,
        txParams,
        userId,
        sessionId,
        messageId: targetMsg?.id,
        req,
      });
    } else if (cardType === "bridge") {
      executionResult = await executeChatBridge({
        wallet,
        pin,
        effectiveCardData,
        txParams,
        userId,
        req,
      });
    } else if (txParams?.type?.startsWith("savings_")) {
      executionResult = await executeChatSavings({
        type: txParams.type as
          | "savings_create"
          | "savings_deposit"
          | "savings_withdraw",
        wallet,
        pin,
        txParams,
        userId,
      });
    } else if (cardType === "offramp") {
      executionResult = await executeChatOfframp({
        wallet,
        pin,
        effectiveCardData,
        txParams,
        userId,
        req,
      });
    } else {
      // Default to transfer (Stellar, EVM, Solana)
      executionResult = await executeChatTransfer({
        wallet,
        pin,
        txParams,
        userId,
        sessionId,
        messageId: targetMsg?.id,
        req,
      });
    }

    if (!executionResult.ok) {
      return NextResponse.json(
        { error: executionResult.error },
        { status: executionResult.status || 400 },
      );
    }

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    // Assistant receipt message
    const defaultReceiptContent =
      cardType === "quote"
        ? `✓ Swap confirmed`
        : cardType === "bridge"
          ? `✓ Bridge transfer initiated in ${elapsedSeconds}s`
          : txParams?.type === "savings_create"
            ? `✓ Savings goal created`
            : txParams?.type === "savings_deposit"
              ? `✓ Savings deposit successful`
              : txParams?.type === "savings_withdraw"
                ? `✓ Savings withdrawal successful`
                : cardType === "offramp"
                  ? `✓ Withdrawal processing for ${effectiveCardData?.bankName || txParams?.bankName || "bank"}`
                  : `✓ Transfer successful`;

    const receiptMsg: IChatMessage = {
      id: generateId("msg"),
      role: "assistant",
      content: executionResult.assistantSummary || defaultReceiptContent,
      isTransaction: true,
      cardType: "receipt",
      status: cardType === "offramp" ? "pending" : "confirmed",
      cardData: executionResult.receiptCardData,
      timestamp: new Date(),
    };

    chatLog.messages.push(userAuthMsg);
    chatLog.messages.push(receiptMsg);

    await chatLog.save();

    // Invalidate server balance caches so fresh balances are returned immediately
    invalidateBalanceCache(userId);
    if (wallet?.address) {
      invalidateBalanceCache(wallet.address);
    }

    logUserActivity({
      userId,
      action: "CHAT_TRANSACTION_CONFIRMED",
      details: {
        sessionId,
        messageId: targetMsg?.id,
        cardType,
        txType: txParams?.type,
        txHash: executionResult.txHash,
      },
      req,
    }).catch(() => {});

    console.log(`[Chat] Action confirmed: type=${cardType} tx=${executionResult.txHash || "n/a"} (${elapsedSeconds}s)`);

    return NextResponse.json({
      success: true,
      data: {
        userAuthMsg,
        receiptMsg,
        messages: chatLog.messages.slice(-12),
      },
    });
  } catch (err: any) {
    console.error(`[Chat] Action confirm error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: "Failed to confirm transaction" },
      { status: 500 },
    );
  }
}
