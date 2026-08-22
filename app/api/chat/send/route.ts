import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { generateId } from "@/lib/schema-ids";
import { ChatLog, type IChatMessage } from "@/models/ChatLog";
import { Wallet } from "@/models/Wallet";
import {
  buildSystemPrompt,
  runDeepSeekStep,
  type ChatHistoryMessage,
} from "@/lib/ai/deepseek";
import {
  getCachedWalletBalances,
  type SupportedChain,
} from "@/lib/wallet-balances";
import { executeTool } from "@/lib/ai/tool-executor";

function detectTargetChains(prompt: string): SupportedChain[] | undefined {
  const p = prompt.toLowerCase();
  const chains: SupportedChain[] = [];

  if (p.includes("stellar") || p.includes("xlm")) chains.push("stellar");
  if (p.includes("solana") || p.includes("sol")) chains.push("solana");
  if (p.includes("bitcoin") || p.includes("btc")) chains.push("bitcoin");
  if (p.includes("base") && !p.includes("ethereum")) chains.push("base");
  else if (
    p.includes("ethereum") ||
    p.includes("evm") ||
    p.includes("polygon") ||
    p.includes("celo") ||
    p.includes("bnb")
  )
    chains.push("evm");

  return chains.length > 0 ? chains : undefined;
}

/**
 * POST /api/chat/send
 * Body: { sessionId?: string, message: string }
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
    const { sessionId, message } = body as {
      sessionId?: string;
      message?: string;
    };

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const userId = session.user.id;

    // Fetch wallet
    const wallet = await Wallet.findOne({ userId }).lean();
    const walletAddress = wallet?.address || "";

    // Fetch live balances (only chains mentioned in the message)
    const targetChains = detectTargetChains(message);
    const balanceData = await getCachedWalletBalances(userId, targetChains);

    const stellarAddress =
      balanceData?.addresses?.xlm || wallet?.addresses?.xlm || walletAddress;
    const solanaAddress = balanceData?.addresses?.sol || wallet?.addresses?.sol || "";
    const baseAddress = balanceData?.addresses?.base || wallet?.addresses?.base || "";

    const liveBalances = balanceData?.summary || {};
    const testnetBalances = balanceData?.testnetSummary || {};

    console.log(`[Chat Send] "${userId}" sent: "${message.trim()}"`);

    // Load or create chat session
    let chatLog: any = null;
    if (sessionId) {
      chatLog = await ChatLog.findOne({ _id: sessionId, userId });
    }
    if (!chatLog) {
      const derivedTitle =
        message.trim().slice(0, 35) + (message.trim().length > 35 ? "…" : "");
      chatLog = new ChatLog({
        userId,
        walletAddress,
        type: "personal",
        title: derivedTitle || "New Chat",
        messages: [],
      });
    }

    const userMessage: IChatMessage = {
      id: generateId("MSG"),
      role: "user",
      content: message.trim(),
      timestamp: new Date(),
    };

    // Build conversation history for the AI (last 10 messages)
    const history: ChatHistoryMessage[] = (chatLog.messages || [])
      .slice(-10)
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content || "",
      }));

    const aiContext = {
      walletAddress,
      stellarAddress,
      solanaAddress,
      baseAddress,
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
        content: message.trim(),
      },
    ];

    const isActionPrompt =
      /\b(send|transfer|pay|swap|convert|trade|exchange|buy|deposit|withdraw|onramp|offramp|check|balance|portfolio|show|get|fetch|lookup|history)\b/i.test(
        message.trim(),
      );

    const MAX_TURNS = 4;
    let turn = 0;
    let finalAssistantContent = "";
    let primaryCardHint: any = { type: "none" };
    let primaryTransactionParams: any = undefined;
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

      console.log(
        `[Chat Send] Calling DeepSeek AI (Turn ${turn}/${MAX_TURNS}, toolChoice: ${toolChoice})...`,
      );

      const stepResponse = await runDeepSeekStep({
        messages,
        toolChoice,
      });

      if (stepResponse.mode === "chat") {
        console.log(
          `[Chat Send] AI text response (Turn ${turn}): "${stepResponse.message.slice(0, 80)}..."`,
        );
        finalAssistantContent = stepResponse.message;
        break;
      }

      // Execute all tool calls returned in this turn
      const { toolCalls, rawAssistantMessage } = stepResponse;
      messages.push(rawAssistantMessage);

      for (const tc of toolCalls) {
        console.log(
          `[Chat Send] Executing tool [${tc.toolName}] with args:`,
          tc.toolArgs,
        );
        const toolResult = await executeTool(tc.toolName, tc.toolArgs, {
          stellarAddress,
          userId: session.user.id,
        });

        console.log(
          `[Chat Send] Tool [${tc.toolName}] executed. requiresConfirmation: ${toolResult.requiresConfirmation}`,
        );

        lastToolSummaries.push(toolResult.summaryForAI);

        if (
          toolResult.requiresConfirmation &&
          toolResult.cardHint?.type &&
          toolResult.cardHint.type !== "none"
        ) {
          requiresConfirmation = true;
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
        id: generateId("MSG"),
        role: "assistant",
        content: finalAssistantContent,
        isTransaction: true,
        cardType: "quote",
        status: "pending",
        transactionParams: primaryTransactionParams,
        cardData: primaryCardHint.data,
        timestamp: new Date(),
      };
    } else if (primaryCardHint.type === "transfer" && requiresConfirmation) {
      assistantMessage = {
        id: generateId("MSG"),
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
        id: generateId("MSG"),
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
        id: generateId("MSG"),
        role: "assistant",
        content: finalAssistantContent,
        isTransaction: true,
        cardType: "offramp",
        status: "pending",
        transactionParams: primaryTransactionParams,
        cardData: primaryCardHint.data,
        timestamp: new Date(),
      };
    } else {
      assistantMessage = {
        id: generateId("MSG"),
        role: "assistant",
        content: finalAssistantContent,
        cardType: "text",
        timestamp: new Date(),
      };
    }

    // Ensure content is never empty
    if (!assistantMessage.content) {
      assistantMessage.content = "I've processed your request.";
    }

    chatLog.messages.push(userMessage);
    chatLog.messages.push(assistantMessage);

    if (!chatLog.title || chatLog.title === "New Chat") {
      chatLog.title =
        message.trim().slice(0, 35) + (message.trim().length > 35 ? "…" : "");
    }

    await chatLog.save();

    return NextResponse.json({
      sessionId: chatLog._id,
      title: chatLog.title,
      userMessage,
      assistantMessage,
    });
  } catch (err) {
    console.error("[Chat Error]", err);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 },
    );
  }
}
