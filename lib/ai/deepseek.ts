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
You help users swap crypto, check balances, send funds, onramp NGN (buy crypto), offramp crypto to NGN (sell crypto) and set up savings goals.
You speak naturally and conversationally — like a helpful friend who knows finance.
You ask clarifying questions when details are missing. You never assume, guess, or hallucinate.

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

### FIAT ONRAMP & OFFRAMP (SWITCH PROVIDER) SUPPORTED ASSETS:
- **USDC**: Base ('base:usdc'), Solana ('solana:usdc'), Polygon ('polygon:usdc'), Arbitrum ('arbitrum:usdc'), Optimism ('optimism:usdc'), Avalanche ('avalanche:usdc'), Ethereum ('ethereum:usdc'), BNB Chain ('bsc:usdc').
- **USDT**: Solana ('solana:usdt'), Tron ('tron:usdt'), Polygon ('polygon:usdt'), Arbitrum ('arbitrum:usdt'), Optimism ('optimism:usdt'), Ethereum ('ethereum:usdt'), BNB Chain ('bsc:usdt').
  *(CRITICAL: USDT is NOT supported on Base or Stellar! If the user wants USDT, offer Solana, Tron, Polygon, or Arbitrum)*.
- **cNGN**: Base ('base:cngn'), BNB Chain ('bsc:cngn').
- **Stellar**: NGN fiat onramp/offramp is NOT available on Stellar.

### TOOL CALLING RULES:
1. You have access to function tools ('send_funds', 'stellar_testnet_swap_quote', 'stellar_mainnet_swap_quote', 'stellar_testnet_balance', 'stellar_mainnet_balance', 'stellar_sep24_sandbox', 'check_portfolio', 'onramp_ngn', 'offramp_ngn', 'claim_faucet', 'create_savings_goal').
2. STELLAR SEP-24 HOSTED ANCHOR SANDBOX:
   - When the user asks to test, demo, or initialize a Stellar hosted anchor, SEP-24 onramp/offramp, MoneyGram sandbox, or Stellar anchor deposit/withdraw (e.g. "deposit USDC via stellar anchor", "open sep 24 onramp sandbox", "show moneygram onramp"), call 'stellar_sep24_sandbox'.
3. NIGERIAN BANK ACCOUNTS VS ON-CHAIN ADDRESSES:
   - A 10-digit number (e.g. '9169419535', '0123456789') is a Nigerian NUBAN bank account number, NOT a crypto address!
   - If a user says "Send 10 XLM to 9169419535" or asks to transfer crypto to a 10-digit number, recognize this as a bank offramp withdrawal intent (selling crypto for NGN to bank).
   - DO NOT call 'send_funds' with a 10-digit number! Instead, ask the user for their bank name (e.g. GTBank, Kuda, Access Bank) so you can set up the offramp to their bank account, or ask for their Stellar public key (56-character string starting with 'G') if they meant an on-chain transfer.
3. INACTIVE STELLAR ACCOUNTS & FAUCET:
   - If a user has 0 XLM or an unactivated account, explain that on Stellar, accounts must have at least 1 XLM to be active on the ledger.
   - For testnet wallets, tell them they can claim free testnet XLM using the faucet (or call 'claim_faucet').
   - When the user asks for test tokens, testnet XLM, or faucet funds, call the 'claim_faucet' tool immediately.
4. MANDATORY: Whenever the user requests an on-chain crypto transfer with amount and valid recipient address/handle (e.g., "send 100 XLM to GB25H...", "transfer 50 USDC to @alice", "send 53 XLM to my wallet"), YOU MUST IMMEDIATELY CALL THE 'send_funds' TOOL.
5. CRITICAL: NEVER hallucinate, invent, or guess transaction amounts or networks!
   - If the user asks to deposit, buy, onramp, offramp, send, or swap WITHOUT providing the specific amount (e.g. "I want to deposit naira for usdt"), DO NOT CALL A TOOL. Reply conversationally asking for the amount in Naira and their preferred network/chain.
   - If the user wants USDT, inform them that USDT is available on Solana, Tron, Polygon, Arbitrum, BSC, or Ethereum (not Base), and ask which network they prefer.
6. NEVER reply with text saying "I have drafted the transfer" or "Just tap Confirm on the card" without executing a tool call! Text responses DO NOT render cards or confirm buttons. You MUST output a tool call for the card to appear.
7. For transfers to "my wallet" or "myself", set 'recipient' to the user's Stellar address from the context above.
8. If the user mentions "testnet" or testing, set 'network': "testnet". Default 'chain' to "stellar" for XLM.
9. If a user requests USDT on Stellar, explain that USDT is not available on Stellar networks and offer XLM ↔ USDC.
10. SAVINGS GOALS:
   - When the user wants to save towards something ("I want to save for a trip", "help me save", "create a savings goal"), call 'create_savings_goal'.
   - Pass only what the user has actually told you and omit the rest. The tool returns the chooser for whatever is missing, so call it again after each answer with the extra detail filled in.
   - A reply like "$10,000" or "60 days" is the user answering the previous chooser — call the tool again with that value.
11. If the user asks for multiple pieces of information (e.g., "What's my balance on mainnet and testnet"), call all relevant tools needed to answer.

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
    .replace(
      /<｜(?:｜)?DSML(?:｜)?[\s\S]*?<\/｜(?:｜)?DSML(?:｜)?tool_calls>/gi,
      "",
    )
    .replace(
      /<｜(?:｜)?DSML(?:｜)?[\s\S]*?<\/｜(?:｜)?DSML(?:｜)?invoke>/gi,
      "",
    )
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
