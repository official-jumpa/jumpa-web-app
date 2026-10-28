import { type NextRequest, NextResponse } from "next/server";
import {
  buildSystemPrompt,
  type ChatHistoryMessage,
  runAgentStep,
} from "@/lib/ai/jumpaAgent";
import { executeTool } from "@/lib/ai/tool-executor";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { detectTargetChains } from "@/lib/blockchain";
import { describeAttachments, isAudioAttachment } from "@/lib/chat-attachments";
import { analyzeImageWithGemini } from "@/lib/ai/vision";
import { getChatAttachments } from "@/lib/functions/chatAttachmentFunctions";
import { generateId } from "@/lib/schema-ids";
import {
  getCachedWalletBalances,
} from "@/lib/wallet-balances";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { getOrCreateChatLog } from "@/lib/functions/chatFunctions";
import { sendMessageSchema } from "@/lib/validations/chat.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { type IChatMessage } from "@/models/ChatLog";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * POST /api/v1/chat/messages
 * Sends a chat message (text, image, audio) and runs the Jumpa AI agent loop.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "medium", action: "chat_send" },
    });
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const validation = sendMessageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const {
      sessionId,
      message,
      attachmentIds,
      attachments: rawAttachments,
    } = validation.data;
    const userId = auth.userId;

    // Use direct attachments when provided; otherwise resolve by attachmentIds
    const attachments = rawAttachments?.length
      ? rawAttachments
      : attachmentIds?.length
        ? await getChatAttachments(userId, attachmentIds)
        : [];

    // Pre-analyze images with timeout-guarded Gemini vision
    let visionAnalysis = "";
    const imageAttachments = attachments.filter(
      (att) => att.mime?.startsWith("image/") && att.url?.startsWith("http"),
    );

    if (imageAttachments.length > 0) {
      try {
        const analysisResults = await Promise.all(
          imageAttachments.map((img) =>
            analyzeImageWithGemini(img.url, message),
          ),
        );
        visionAnalysis = analysisResults
          .map(
            (res, idx) =>
              `Image [${imageAttachments[idx].name}]:\n${res.analysis}`,
          )
          .join("\n\n");
      } catch (visErr) {
        console.error(
          `[Chat] Vision analysis failed: ${formatOneLineError(visErr)}`,
        );
      }
    }

    const nonAudioAttachments = attachments.filter(
      (att) => !isAudioAttachment(att.mime, att.name),
    );
    const attachmentNote = describeAttachments(nonAudioAttachments, visionAnalysis);

    const wallet = await findWalletForUser(userId);
    const walletAddress = wallet?.address || "";

    // Fetch live balances for relevant chains
    const targetChains = detectTargetChains(message);
    const balanceData = await getCachedWalletBalances(userId, targetChains);

    const stellarAddress =
      balanceData?.addresses?.xlm || wallet?.addresses?.xlm || walletAddress;
    const solanaAddress =
      balanceData?.addresses?.sol || wallet?.addresses?.sol || "";
    const baseAddress =
      balanceData?.addresses?.base || wallet?.addresses?.base || "";
    const tronAddress =
      balanceData?.addresses?.trx || wallet?.addresses?.trx || "";

    const liveBalances = balanceData?.summary || {};
    const testnetBalances = balanceData?.testnetSummary || {};

    const chatLog = await getOrCreateChatLog({
      userId,
      sessionId,
      walletAddress,
    });

    const userMessage: IChatMessage = {
      id: generateId("msg"),
      role: "user",
      content: message.trim(),
      timestamp: new Date(),
      ...(attachments.length ? { attachments } : {}),
    };

    // Build conversation history for the AI (last 10 messages)
    const history: ChatHistoryMessage[] = (chatLog.messages || [])
      .slice(-10)
      .map((m: any) => {
        let text = [m.content || "", describeAttachments(m.attachments)]
          .filter(Boolean)
          .join("\n\n");
        if (m.role === "assistant" && m.transactionParams) {
          text += `\n[Context: Pending ${m.transactionParams.type || m.cardType} with data: ${JSON.stringify(m.transactionParams)}]`;
        }
        return {
          role: m.role as "user" | "assistant",
          content: text || "",
        };
      });

    const aiContext = {
      walletAddress,
      stellarAddress,
      solanaAddress,
      baseAddress,
      tronAddress,
      balances: liveBalances,
      testnetBalances,
    };

    const messages: ChatHistoryMessage[] = [
      {
        role: "system",
        content: buildSystemPrompt(aiContext),
      },
      ...history,
      {
        role: "user",
        content: [message.trim(), attachmentNote].filter(Boolean).join("\n\n"),
      },
    ];

    // Detect action intents for tool gating
    const sanitizedMsg = message
      .replace(/(?:\+?234|\b0)\d{9,11}\b/g, "")
      .replace(/\b\d{10,}\b/g, "");
    const hasNumericalAmount =
      /(?:\$|₦|£|€)?\b\d+(\.\d+)?\s*(k|m|thousand|million)?\b/i.test(sanitizedMsg) ||
      /\b\d+(\.\d+)?\s*(usdc|usdt|xlm|sol|eth|naira|ngn)\b/i.test(sanitizedMsg);
    const isLookupAction =
      /\b(balance|balances|portfolio|holdings|net worth|history)\b/i.test(
        message,
      );
    const isTransactionalAction =
      /\b(send|transfer|pay|swap|convert|trade|exchange|buy|deposit|withdraw|onramp|offramp|cash\s*out)\b/i.test(
        message,
      );

    const lastAssistantCard = [...(chatLog.messages || [])]
      .reverse()
      .find((m: IChatMessage) => m.role === "assistant")?.cardType;
    const isChooserReply =
      lastAssistantCard === "options" || lastAssistantCard === "plans";

    const isActionPrompt =
      isLookupAction ||
      isChooserReply ||
      (isTransactionalAction &&
        (hasNumericalAmount ||
          /\b(opay|palmpay|kuda|gtbank|access|zenith|bank|\d{10})\b/i.test(
            sanitizedMsg,
          )));

    // Fast-path for pure confirmations without modifications
    const trimmedMsg = message.trim();
    const hasModifyingIntent =
      /\b(add|change|modify|fee|fees|top|account|bank|instead|different|regenerate|redo|update)\b/i.test(
        trimmedMsg,
      );
    const isPureAffirmativeReply =
      /^(yes|yeah|yep|confirm|approved|proceed|send it|ok|okay)[.!]?$/i.test(
        trimmedMsg,
      ) ||
      (/^(yes|yeah|yep|confirm|approved|proceed|send it|ok|okay)\b/i.test(
        trimmedMsg,
      ) &&
        !hasModifyingIntent);

    const lastPendingTxMsg = [...(chatLog.messages || [])]
      .reverse()
      .find((m: IChatMessage) => m.isTransaction && m.status === "pending");

    if (isPureAffirmativeReply && lastPendingTxMsg) {
      const reminderContent =
        "Please review the card above and confirm to enter your PIN to complete this transaction.";
      const assistantMessage: IChatMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: reminderContent,
        cardType: "text",
        timestamp: new Date(),
      };
      chatLog.messages.push(userMessage);
      chatLog.messages.push(assistantMessage);
      await chatLog.save();

      return NextResponse.json({
        success: true,
        data: {
          sessionId: chatLog._id || chatLog.sessionId,
          title: chatLog.title,
          userMessage,
          assistantMessage,
        },
      });
    }

    const MAX_TURNS = 4;
    let turn = 0;
    let finalAssistantContent = "";
    let primaryCardHint: any = { type: "none" };
    let primaryTransactionParams: any;
    let requiresConfirmation = false;
    const lastToolSummaries: string[] = [];

    // Iterative Multi-Tool Agent Loop
    while (turn < MAX_TURNS) {
      turn++;
      const toolChoice =
        turn === 1 && isActionPrompt
          ? "required"
          : turn === MAX_TURNS
            ? "none"
            : "auto";

      const stepResponse = await runAgentStep({
        messages,
        toolChoice,
      });

      if (stepResponse.mode === "chat") {
        finalAssistantContent = stepResponse.message;
        break;
      }

      // Execute all tool calls returned in this turn
      const { toolCalls, rawAssistantMessage } = stepResponse;
      messages.push(rawAssistantMessage);

      for (const tc of toolCalls) {
        const toolResult = await executeTool(tc.toolName, tc.toolArgs, {
          stellarAddress,
          userId,
        });

        lastToolSummaries.push(toolResult.summaryForAI);

        if (toolResult.cardHint?.type && toolResult.cardHint.type !== "none") {
          if (toolResult.requiresConfirmation) {
            requiresConfirmation = true;
          }
          primaryCardHint = toolResult.cardHint;
          primaryTransactionParams = toolResult.transactionParams;
        }

        messages.push({
          role: "tool",
          tool_call_id: tc.toolCallId,
          name: tc.toolName,
          content: toolResult.summaryForAI,
        });
      }
    }

    if (!finalAssistantContent) {
      finalAssistantContent =
        lastToolSummaries.join("\n\n") || "I've processed your request.";
    }

    let assistantMessage: IChatMessage;

    if (primaryCardHint.type === "quote" && requiresConfirmation) {
      assistantMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: finalAssistantContent,
        isTransaction: true,
        cardType: "quote",
        status: "pending",
        transactionParams: primaryTransactionParams,
        cardData: primaryCardHint.data,
        timestamp: new Date(),
      };
    } else if (primaryCardHint.type === "bridge" && requiresConfirmation) {
      assistantMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: finalAssistantContent,
        isTransaction: true,
        cardType: "bridge",
        status: "pending",
        transactionParams: primaryTransactionParams,
        cardData: primaryCardHint.data,
        timestamp: new Date(),
      };
    } else if (primaryCardHint.type === "transfer" && requiresConfirmation) {
      assistantMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: finalAssistantContent,
        isTransaction: true,
        cardType: "transfer",
        status: "pending",
        transactionParams: primaryTransactionParams,
        cardData: primaryCardHint.data,
        timestamp: new Date(),
      };
    } else if (primaryCardHint.type === "onramp") {
      assistantMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: finalAssistantContent,
        isTransaction: true,
        cardType: "onramp",
        status: "pending",
        transactionParams: primaryTransactionParams,
        cardData: primaryCardHint.data,
        timestamp: new Date(),
      };
    } else if (primaryCardHint.type === "offramp") {
      assistantMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: finalAssistantContent,
        isTransaction: true,
        cardType: "offramp",
        status: "pending",
        transactionParams: primaryTransactionParams,
        cardData: primaryCardHint.data,
        timestamp: new Date(),
      };
    } else if (primaryCardHint.type === "accounts") {
      assistantMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: finalAssistantContent,
        cardType: "accounts",
        cardData: primaryCardHint.data,
        timestamp: new Date(),
      };
    } else if (primaryCardHint.type === "options") {
      assistantMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: finalAssistantContent,
        cardType: "options",
        cardData: primaryCardHint.data,
        timestamp: new Date(),
      };
    } else if (primaryCardHint.type === "plans") {
      assistantMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: finalAssistantContent,
        cardType: "plans",
        cardData: primaryCardHint.data,
        timestamp: new Date(),
      };
    } else if (primaryCardHint.type === "sep24") {
      assistantMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: finalAssistantContent,
        isTransaction: false,
        cardType: "sep24",
        status: "confirmed",
        cardData: primaryCardHint.data,
        timestamp: new Date(),
      };
    } else {
      assistantMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: finalAssistantContent,
        cardType: "text",
        timestamp: new Date(),
      };
    }

    if (!assistantMessage.content) {
      assistantMessage.content = "I've processed your request.";
    }

    chatLog.messages.push(userMessage);
    chatLog.messages.push(assistantMessage);

    if (!chatLog.title || chatLog.title === "New Chat") {
      const subject = message.trim() || attachments[0]?.name || "New Chat";
      chatLog.title = subject.slice(0, 35) + (subject.length > 35 ? "…" : "");
    }

    await chatLog.save();

    const elapsedMs = Date.now() - startTime;
    console.log(
      `[Chat] Sent message: session=${chatLog._id || chatLog.sessionId} turns=${turn} card=${primaryCardHint.type} (${elapsedMs}ms)`,
    );

    return NextResponse.json({
      success: true,
      data: {
        sessionId: chatLog._id || chatLog.sessionId,
        title: chatLog.title,
        userMessage,
        assistantMessage,
      },
    });
  } catch (err: any) {
    console.error(`[Chat] Messages error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 },
    );
  }
}
