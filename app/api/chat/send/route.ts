import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { generateId } from "@/lib/schema-ids";
import { ChatLog, type IChatMessage } from "@/models/ChatLog";
import { Wallet } from "@/models/Wallet";
import { callDeepSeekAI, getAIFollowUpAfterTool } from "@/lib/ai/deepseek";
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
    const history = (chatLog.messages || []).slice(-10).map((m: any) => ({
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

    // Turn 1: Ask the AI what it wants to do 
    console.log("[Chat Send] Calling DeepSeek AI (Turn 1)...");
    const aiResponse = await callDeepSeekAI({
      prompt: message.trim(),
      history,
      context: aiContext,
    });

    let assistantMessage: IChatMessage;

    if (aiResponse.mode === "chat") {
      // Pure conversation — no tool call needed
      console.log(`[Chat Send] AI chat response: "${aiResponse.message.slice(0, 60)}..."`);
      assistantMessage = {
        id: generateId("MSG"),
        role: "assistant",
        content: aiResponse.message,
        cardType: "text",
        timestamp: new Date(),
      };
    } else {
      // ── Tool Call: Execute the tool 
      const { toolCallId, toolName, toolArgs } = aiResponse;
      console.log(`[Chat Send] AI tool call: ${toolName}`, toolArgs);

      const toolResult = await executeTool(toolName, toolArgs, {
        stellarAddress,
        userId: session.user.id,
      });

      console.log(`[Chat Send] Tool executed. requiresConfirmation: ${toolResult.requiresConfirmation}`);

      // Turn 2: Feed the tool result back to the AI for a natural response
      console.log("[Chat Send] Calling DeepSeek AI (Turn 2 — follow-up)...");
      const aiFollowUp = await getAIFollowUpAfterTool({
        prompt: message.trim(),
        history,
        context: aiContext,
        toolCallId,
        toolName,
        toolArgs,
        toolResultSummary: toolResult.summaryForAI,
      });

      console.log(`[Chat Send] AI follow-up: "${aiFollowUp.slice(0, 80)}..."`);

      // Build the assistant message based on card hint type
      const cardHint = toolResult.cardHint;

      if (cardHint.type === "quote" && toolResult.requiresConfirmation) {
        assistantMessage = {
          id: generateId("MSG"),
          role: "assistant",
          content: aiFollowUp,
          isTransaction: true,
          cardType: "quote",
          status: "pending",
          transactionParams: toolResult.transactionParams,
          cardData: cardHint.data,
          timestamp: new Date(),
        };
      } else if (cardHint.type === "transfer" && toolResult.requiresConfirmation) {
        assistantMessage = {
          id: generateId("MSG"),
          role: "assistant",
          content: aiFollowUp,
          isTransaction: true,
          cardType: "transfer",
          status: "pending",
          transactionParams: toolResult.transactionParams,
          cardData: cardHint.data,
          timestamp: new Date(),
        };
      } else if (cardHint.type === "onramp") {
        assistantMessage = {
          id: generateId("MSG"),
          role: "assistant",
          content: aiFollowUp,
          isTransaction: true,
          cardType: "onramp",
          status: "pending",
          transactionParams: toolResult.transactionParams,
          cardData: cardHint.data,
          timestamp: new Date(),
        };
      } else if (cardHint.type === "offramp") {
        assistantMessage = {
          id: generateId("MSG"),
          role: "assistant",
          content: aiFollowUp,
          isTransaction: true,
          cardType: "offramp",
          status: "pending",
          transactionParams: toolResult.transactionParams,
          cardData: cardHint.data,
          timestamp: new Date(),
        };
      } else {
        // No card — pure AI message (e.g. balance check, error)
        assistantMessage = {
          id: generateId("MSG"),
          role: "assistant",
          content: aiFollowUp || toolResult.summaryForAI,
          cardType: "text",
          timestamp: new Date(),
        };
      }
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
