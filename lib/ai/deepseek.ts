/**
 * Jumpa AI — DeepSeek Client with Function Calling
 *
 * The AI decides which tool to call. The server executes it.
 * No hardcoded intent patterns. No regex fallbacks. No guesswork.
 * If the AI cannot determine intent, it returns a chat message asking the user to clarify.
 */

import { JUMPA_TOOLS, type ToolCall } from "./tools";

export interface ChatHistoryMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface QueryDeepSeekOptions {
  prompt: string;
  history?: ChatHistoryMessage[];
  context?: {
    walletAddress?: string;
    stellarAddress?: string;
    solanaAddress?: string;
    baseAddress?: string;
    balances?: Record<string, string>;
    testnetBalances?: Record<string, string>;
  };
  /** Pass a tool result back to get a natural follow-up message from the AI */
  toolResultMessage?: ChatHistoryMessage;
}

export type AIResponse =
  | { mode: "chat"; message: string }
  | {
      mode: "tool_call";
      toolCallId: string;
      toolName: string;
      toolArgs: Record<string, any>;
    };

function buildSystemPrompt(
  context?: QueryDeepSeekOptions["context"],
): string {
  return `You are Jumpa AI — a friendly, knowledgeable personal finance assistant inside the Jumpa app.
Jumpa is a multi-chain Web3 + fiat neo-banking platform for users in Nigeria and beyond.

### YOUR ROLE:
You help users swap crypto, check balances, send funds, onramp NGN and offramp crypto to NGN.
You speak naturally and conversationally — like a helpful friend who knows finance.
You ask clarifying questions when details are missing. You never assume or guess.

### USER CONTEXT:
- Stellar Address: ${context?.stellarAddress || context?.walletAddress || "Not connected"}
- Solana Address: ${context?.solanaAddress || "Not connected"}
- Base / EVM Address: ${context?.baseAddress || "Not connected"}
- Mainnet Balances: ${JSON.stringify(context?.balances || {}, null, 2)}
- Stellar Testnet Balances: ${JSON.stringify(context?.testnetBalances || {}, null, 2)}
- Current Time: ${new Date().toISOString()}

### SUPPORTED NETWORKS & ASSETS:
- Stellar Testnet: XLM, USDC only (USDT does NOT exist on Stellar)
- Stellar Mainnet: XLM, USDC only
- Solana Mainnet: SOL, USDC, USDT
- Base / EVM Mainnet: ETH, USDC, USDT, BNB, POL, CELO
- Bitcoin Mainnet: BTC
- Fiat: Nigerian Naira (NGN / ₦)

### TOOL CALLING RULES:
1. You have access to function tools ('send_funds', 'stellar_testnet_swap_quote', 'stellar_mainnet_swap_quote', 'stellar_testnet_balance', 'stellar_mainnet_balance', 'check_portfolio', 'onramp_ngn', 'offramp_ngn').
2. MANDATORY: Whenever the user requests to send or transfer crypto (e.g., "send 100 XLM to GB25H...", "transfer 50 USDC to @alice", "send 53 XLM to my wallet"), YOU MUST IMMEDIATELY CALL THE 'send_funds' TOOL with the parameters: { amount, token, recipient, chain: "stellar", network: "testnet" | "mainnet" }.
3. NEVER reply with text saying "I have drafted the transfer" or "Just tap Confirm on the card" without executing a tool call! Text responses DO NOT render cards or confirm buttons. You MUST output a tool call for the card to appear.
4. For transfers to "my wallet" or "myself", set 'recipient' to the user's Stellar address from the context above.
5. If the user mentions "testnet" or testing, set 'network': "testnet". Default 'chain' to "stellar" for XLM.
6. If a user requests USDT on Stellar, explain that USDT is not available on Stellar networks and offer XLM ↔ USDC.
7. Only ask clarifying questions if the user hasn't specified the amount OR recipient OR tokens at all (e.g. "I want to send money"). If amount, token, and recipient are present, CALL THE TOOL IMMEDIATELY.
### FORMATTING & TONE:
- NEVER use emojis in any response (no 🚀, 😄, 👍, etc.).
- Keep responses extremely short, direct, and concise (1 sentence max for turn 2 follow-ups).
- For turn 2 follow-ups after a tool call (send/swap), simply tell the user to confirm (e.g. " Please confirm to proceed with the transaction.").
- DO NOT mention UI buttons, PINs, or clicking (do NOT say "tap Confirm", "click", or "enter your PIN").
- Use **bold** for amounts and token names.
- Never render raw JSON or code blocks in your responses.`;
}

export async function callDeepSeekAI(
  options: QueryDeepSeekOptions,
): Promise<AIResponse> {
  const { prompt, history = [], context, toolResultMessage } = options;

  const apiKey = process.env.DEEPSEEK_API;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) {
    console.warn("[DeepSeek] API key missing");
    return {
      mode: "chat",
      message:
        "An error occured. Please try again in a moment.",
    };
  }

  const systemMessage = {
    role: "system" as const,
    content: buildSystemPrompt(context),
  };

  // Build message chain
  const messages: any[] = [systemMessage, ...history.slice(-10)];

  // If we're doing turn 2 (feeding tool result back), don't add the user message again
  if (toolResultMessage) {
    messages.push(toolResultMessage);
  } else {
    messages.push({ role: "user", content: prompt });
  }

  // Detect if user prompt requests an action or lookup (send, transfer, swap, balance, check, etc.)
  const isActionPrompt =
    !toolResultMessage &&
    /\b(send|transfer|pay|swap|convert|trade|exchange|buy|deposit|withdraw|onramp|offramp|check|balance|portfolio|show|get|fetch|lookup|history)\b/i.test(
      prompt,
    );

  const toolChoice = isActionPrompt ? "required" : "auto";
  console.log(`[DeepSeek] Model: ${model} | Tool Choice: ${toolChoice} | Action Prompt: ${isActionPrompt}`);

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        tools: JUMPA_TOOLS,
        tool_choice: toolChoice,
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[DeepSeek API Error]", response.status, errText);
      return {
        mode: "chat",
        message:
          "An error occured. Please try again.",
      };
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      return {
        mode: "chat",
        message: "I didn't get a response. Could you try rephrasing that?",
      };
    }

    const message = choice.message;

    // Function/tool call mode
    if (
      choice.finish_reason === "tool_calls" &&
      message?.tool_calls?.length > 0
    ) {
      const toolCall: ToolCall = message.tool_calls[0];
      let toolArgs: Record<string, any> = {};

      try {
        toolArgs = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error(
          "[DeepSeek] Failed to parse tool args:",
          toolCall.function.arguments,
        );
        return {
          mode: "chat",
          message:
            "I had trouble processing that request. Could you try rephrasing?",
        };
      }

      console.log(
        `[DeepSeek] Tool call: ${toolCall.function.name}`,
        toolArgs,
      );

      return {
        mode: "tool_call",
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        toolArgs,
      };
    }

    // Chat mode
    const rawContent = message?.content?.trim() || "";

    if (!rawContent) {
      return {
        mode: "chat",
        message: "I'm not sure how to help with that. Could you rephrase it?",
      };
    }

    return { mode: "chat", message: rawContent };
  } catch (err) {
    console.error("[DeepSeek Fetch Error]", err);
    return {
      mode: "chat",
      message:
        "Sorry, I ran into a connection error. Please check your internet and try again.",
    };
  }
}

/**
 * Turn 2: Feed a tool result back to the AI to get a natural-language response.
 * The AI receives the tool result and composes a helpful reply.
 */
export async function getAIFollowUpAfterTool(options: {
  prompt: string;
  history: ChatHistoryMessage[];
  context?: QueryDeepSeekOptions["context"];
  toolCallId: string;
  toolName: string;
  toolArgs: Record<string, any>;
  toolResultSummary: string;
}): Promise<string> {
  const {
    prompt,
    history,
    context,
    toolCallId,
    toolName,
    toolArgs,
    toolResultSummary,
  } = options;

  const apiKey = process.env.DEEPSEEK_API;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) {
    return toolResultSummary; // fall back to raw tool summary
  }

  const systemMessage = {
    role: "system" as const,
    content: buildSystemPrompt(context),
  };

  const messages: any[] = [
    systemMessage,
    ...history.slice(-8),
    { role: "user", content: prompt },
    // Simulate the assistant's tool call
    {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: toolCallId,
          type: "function",
          function: { name: toolName, arguments: JSON.stringify(toolArgs) },
        },
      ],
    },
    // Tool result message
    {
      role: "tool",
      tool_call_id: toolCallId,
      name: toolName,
      content: toolResultSummary,
    },
  ];

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      return toolResultSummary;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    return content || toolResultSummary;
  } catch {
    return toolResultSummary;
  }
}
