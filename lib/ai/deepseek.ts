/**
 * Jumpa AI — DeepSeek Client with Function Calling & Multi-Tool Agent Loop
 *
 * The AI decides which tools to call. The server executes them in an iterative loop.
 * Supports parallel tool calls in a single turn and multi-turn sequential tool chaining.
 * Includes DSML parser fallback and sanitizer to guarantee raw model markup never leaks to the user.
 */

import { JUMPA_TOOLS, type ToolCall } from "./tools";

export interface ChatHistoryMessage {
  role: "user" | "assistant" | "tool" | "system";
  content?: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: any[];
}

export interface ParsedToolCall {
  toolCallId: string;
  toolName: string;
  toolArgs: Record<string, any>;
}

export interface DeepSeekContext {
  walletAddress?: string;
  stellarAddress?: string;
  solanaAddress?: string;
  baseAddress?: string;
  balances?: Record<string, string>;
  testnetBalances?: Record<string, string>;
}

export type AIStepResponse =
  | { mode: "chat"; message: string }
  | {
      mode: "tool_calls";
      toolCalls: ParsedToolCall[];
      rawAssistantMessage: any;
    };

export function buildSystemPrompt(context?: DeepSeekContext): string {
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
8. If the user asks for multiple pieces of information (e.g., "What's my balance on mainnet and testnet"), call all relevant tools needed to answer.

### FORMATTING & TONE:
- NEVER use emojis in any response (no 🚀, 😄, 👍, etc.).
- Keep responses short, direct, and concise (1-2 sentences max for follow-ups).
- For follow-ups after a transaction tool call (send/swap), simply tell the user to confirm (e.g. "Please confirm to proceed with the transaction.").
- DO NOT mention UI buttons, PINs, or clicking (do NOT say "tap Confirm", "click", or "enter your PIN").
- Use **bold** for amounts and token names.
- Never render raw JSON, code blocks, or raw markup/DSML tags in your responses.`;
}

/**
 * Remove any leaked DSML tokens or XML-like tags from assistant text.
 */
export function sanitizeDSML(content: string): string {
  if (!content) return "";
  return content
    .replace(/<｜(?:｜)?DSML(?:｜)?[\s\S]*?<\/｜(?:｜)?DSML(?:｜)?tool_calls>/gi, "")
    .replace(/<｜(?:｜)?DSML(?:｜)?[\s\S]*?<\/｜(?:｜)?DSML(?:｜)?invoke>/gi, "")
    .replace(/<｜(?:｜)?DSML(?:｜)?[\s\S]*?>/gi, "")
    .replace(/<｜[\s\S]*?｜>/gi, "")
    .trim();
}

/**
 * Parse raw DSML tool calls if DeepSeek outputs them in content instead of structured tool_calls.
 */
export function parseDSMLToolCalls(content: string): ParsedToolCall[] {
  if (!content || !content.includes("DSML")) return [];

  const toolCalls: ParsedToolCall[] = [];
  const invokeRegex =
    /<｜(?:｜)?DSML(?:｜)?invoke\s+name=["']([^"']+)["']>([\s\S]*?)<\/｜(?:｜)?DSML(?:｜)?invoke>/gi;
  let match: RegExpExecArray | null;

  while ((match = invokeRegex.exec(content)) !== null) {
    const toolName = match[1];
    const rawBody = match[2]?.trim() || "{}";
    let toolArgs: Record<string, any> = {};

    try {
      if (rawBody.startsWith("{") && rawBody.endsWith("}")) {
        toolArgs = JSON.parse(rawBody);
      } else {
        const paramRegex =
          /<｜(?:｜)?DSML(?:｜)?parameter\s+name=["']([^"']+)["']>([\s\S]*?)<\/｜(?:｜)?DSML(?:｜)?parameter>/gi;
        let paramMatch: RegExpExecArray | null;
        while ((paramMatch = paramRegex.exec(rawBody)) !== null) {
          const key = paramMatch[1];
          const val = paramMatch[2]?.trim();
          try {
            toolArgs[key] = JSON.parse(val);
          } catch {
            toolArgs[key] = val;
          }
        }
      }
    } catch (e) {
      console.warn("[DeepSeek DSML Parse Warning]", e);
    }

    toolCalls.push({
      toolCallId: `call_dsml_${Date.now()}_${toolCalls.length}`,
      toolName,
      toolArgs,
    });
  }

  return toolCalls;
}

/**
 * Execute a single step with DeepSeek.
 * Can return either chat text or 1+ tool calls to execute.
 */
export async function runDeepSeekStep(options: {
  messages: ChatHistoryMessage[];
  toolChoice?: "auto" | "required" | "none";
  temperature?: number;
  maxTokens?: number;
}): Promise<AIStepResponse> {
  const {
    messages,
    toolChoice = "auto",
    temperature = 0.3,
    maxTokens = 1024,
  } = options;

  const apiKey = process.env.DEEPSEEK_API;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) {
    console.warn("[DeepSeek] API key missing");
    return {
      mode: "chat",
      message: "An error occurred. Please try again in a moment.",
    };
  }

  try {
    const requestBody: Record<string, any> = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    if (toolChoice !== "none") {
      requestBody.tools = JUMPA_TOOLS;
      requestBody.tool_choice = toolChoice;
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[DeepSeek API Error]", response.status, errText);
      return {
        mode: "chat",
        message: "An error occurred. Please try again.",
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

    // Structured tool calls from API
    if (
      choice.finish_reason === "tool_calls" ||
      (message?.tool_calls && message.tool_calls.length > 0)
    ) {
      const toolCalls: ParsedToolCall[] = [];
      for (const tc of message.tool_calls) {
        let args: Record<string, any> = {};
        try {
          args =
            typeof tc.function.arguments === "string"
              ? JSON.parse(tc.function.arguments)
              : tc.function.arguments || {};
        } catch {
          console.error(
            "[DeepSeek] Failed to parse tool args:",
            tc.function.arguments,
          );
          args = {};
        }
        toolCalls.push({
          toolCallId: tc.id || `call_${Date.now()}_${toolCalls.length}`,
          toolName: tc.function.name,
          toolArgs: args,
        });
      }

      if (toolCalls.length > 0) {
        console.log(
          `[DeepSeek] Structured tool calls received (${toolCalls.length}):`,
          toolCalls.map((t) => t.toolName).join(", "),
        );
        return {
          mode: "tool_calls",
          toolCalls,
          rawAssistantMessage: message,
        };
      }
    }

    // Fallback: Check if raw DSML markup is in message content
    const rawContent = message?.content || "";
    const dsmlCalls = parseDSMLToolCalls(rawContent);
    if (dsmlCalls.length > 0) {
      console.log(
        `[DeepSeek] Extracted ${dsmlCalls.length} tool calls from DSML markup:`,
        dsmlCalls.map((t) => t.toolName).join(", "),
      );
      return {
        mode: "tool_calls",
        toolCalls: dsmlCalls,
        rawAssistantMessage: {
          role: "assistant",
          content: null,
          tool_calls: dsmlCalls.map((tc) => ({
            id: tc.toolCallId,
            type: "function",
            function: {
              name: tc.toolName,
              arguments: JSON.stringify(tc.toolArgs),
            },
          })),
        },
      };
    }

    // Pure chat mode
    const cleanContent = sanitizeDSML(rawContent);
    return {
      mode: "chat",
      message: cleanContent || "I've processed your request.",
    };
  } catch (err) {
    console.error("[DeepSeek Fetch Error]", err);
    return {
      mode: "chat",
      message:
        "Sorry, I ran into a connection error. Please check your internet and try again.",
    };
  }
}

