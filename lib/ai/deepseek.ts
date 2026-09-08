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
- Base / EVM Mainnet: ETH, USDC, USDT, BNB
- Fiat: Nigerian Naira (NGN / ₦)

### FIAT ONRAMP & OFFRAMP (SWITCH PROVIDER) SUPPORTED ASSETS:
- **USDC**: Base ('base:usdc'), Solana ('solana:usdc'), Avalanche ('avalanche:usdc'), Ethereum ('ethereum:usdc'), BNB Chain ('bsc:usdc').
- **USDT**: Solana ('solana:usdt'), Tron ('tron:usdt'), Ethereum ('ethereum:usdt'), BNB Chain ('bsc:usdt').
  *(CRITICAL: USDT is NOT supported on Base or Stellar! If the user wants USDT, offer Solana, Tron, BSC, or Ethereum)*.
- **cNGN**: Base ('base:cngn'), BNB Chain ('bsc:cngn').
- **Stellar**: NGN fiat onramp/offramp is NOT available on Stellar.

### TOOL CALLING RULES:
1. You have access to function tools ('send_funds', 'swap_tokens', 'stellar_testnet_swap_quote', 'stellar_mainnet_swap_quote', 'stellar_testnet_balance', 'stellar_mainnet_balance', 'stellar_sep24_sandbox', 'check_portfolio', 'onramp_ngn', 'offramp_ngn', 'claim_faucet', 'create_savings_goal', 'list_savings', 'deposit_savings', 'withdraw_savings', 'bridge_tokens').
2. STELLAR SEP-24 HOSTED ANCHOR SANDBOX:
   - When the user asks to test, demo, or initialize a Stellar hosted anchor, SEP-24 onramp/offramp, MoneyGram sandbox, or Stellar anchor deposit/withdraw (e.g. "deposit USDC via stellar anchor", "open sep 24 onramp sandbox", "show moneygram onramp"), call 'stellar_sep24_sandbox'.
3. NIGERIAN BANK ACCOUNTS VS ON-CHAIN ADDRESSES:
   - A 10-digit number (e.g. '9169419535', '0123456789') is a Nigerian NUBAN bank account number, NOT a crypto address!
   - If a user says "Send 10 XLM to 9169419535" or asks to transfer crypto to a 10-digit number, recognize this as a bank offramp withdrawal intent (selling crypto for NGN to bank).
   - DO NOT call 'send_funds' with a 10-digit number! Instead, ask the user for their bank name (e.g. GTBank, Kuda, Access Bank) so you can set up the offramp to their bank account, or ask for their Stellar public key (56-character string starting with 'G') if they meant an on-chain transfer.
3. INACTIVE STELLAR ACCOUNTS & FAUCET:
   - If a user has 0 XLM or an unactivated account, explain that on Stellar, accounts must have at least 1 XLM to be active on ledger.
   - For testnet wallets, tell them they can claim free testnet XLM using the faucet (or call 'claim_faucet').
   - When the user asks for test tokens, testnet XLM, or faucet funds, call the 'claim_faucet' tool immediately.
4. MANDATORY: Whenever the user requests an on-chain crypto transfer with amount and valid recipient address/handle (e.g., "send 100 XLM to GB25H...", "transfer 50 USDC to @alice", "send 53 XLM to my wallet"), YOU MUST IMMEDIATELY CALL THE 'send_funds' TOOL.
5. CRITICAL: NEVER hallucinate, invent, or guess transaction amounts or networks!
   - If the user asks to deposit, buy, onramp or send WITHOUT providing the specific amount (e.g. "I want to deposit naira for usdt"), DO NOT CALL A TOOL. Reply conversationally asking for the amount in Naira and their preferred network/chain.
   - Swaps are the exception: an open-ended swap goes to 'swap_tokens', which asks with cards (see SWAPPING below).
   - If the user wants USDT, inform them that USDT is available on Solana, Tron, BSC, or Ethereum (not Base), and ask which network they prefer.
6. NEVER reply with text saying "I have drafted the transfer" or "Just tap Confirm on the card" without executing a tool call! Text responses DO NOT render cards or confirm buttons. You MUST output a tool call for the card to appear.
7. For transfers to "my wallet" or "myself", set 'recipient' to the user's Stellar address from the context above.
8. If the user mentions "testnet" or testing, set 'network': "testnet". Default 'chain' to "stellar" for XLM.
9. If a user requests USDT on Stellar, explain that USDT is not available on Stellar networks and offer XLM ↔ USDC.
10. CASHING OUT (OFFRAMP):
   - When the user wants to cash out, withdraw, or sell crypto for Naira, call 'offramp_ngn' straight away with only what they have told you — omit the token, network, account number and bank if they have not said them.
   - The tool answers with the chooser for whatever is missing, so DO NOT ask for the token, the network, the account number or the bank in prose. Asking in text instead of calling the tool is a bug.
   - After each answer, call 'offramp_ngn' again with that detail added.
   - A bare 10-digit number in reply to a cash-out is the account number; a bank name on its own is the bank.
11. SAVINGS MANAGEMENT (CREATING, LISTING, DEPOSITING, WITHDRAWING):
   - Interactive Conversational Flow: DO NOT ask for savings details in prose when a tool can return a chooser card. Always call the savings tools immediately with whatever the user gave, and let the tool emit the interactive chooser cards.
   - CREATING A SAVINGS GOAL:
     * When the user wants to save ("I want to save", "create a savings goal", "save for rent", "help me save"): call 'create_savings_goal' immediately.
     * The tool returns category choosers ('Rent', 'Travel', 'Groceries', 'Transportation', 'Others'), amount choosers, duration choosers, and initial deposit choosers.
     * When the user replies with a category or goal name (e.g. "Rent", "rent savings", "December trip") or any subsequent detail (amount, duration, deposit), YOU MUST CALL 'create_savings_goal' with the accumulated parameters.
     * NEVER ask for the target amount or duration in plain text without calling 'create_savings_goal'! Calling the tool is required to display the amount and duration chooser cards.
   - LISTING SAVINGS GOALS:
     * When the user asks to see their savings ("show my savings", "list my savings", "check savings goals", "how much have I saved"): call 'list_savings'.
     * The tool returns an interactive options card listing each active goal, its balance and target.
   - DEPOSITING / TOPPING UP SAVINGS:
     * When the user asks to deposit or top up ("deposit to savings", "add money to my savings", "top up December trip", "add $50 to savings"): call 'deposit_savings'.
     * If the goal or amount is missing, the tool returns the chooser cards for them.
   - WITHDRAWING FROM SAVINGS:
     * When the user asks to withdraw from savings ("withdraw from savings", "cash out my savings", "withdraw from December trip"): call 'withdraw_savings'.
     * If the goal or amount is missing, the tool returns the chooser cards for them.
12. SWAPPING:
   - Any open-ended swap — "swap tokens", "I want to swap", "swap my XLM" — calls 'swap_tokens' straight away with only what the user has said.
   - The tool answers with the chooser for whatever is missing, so DO NOT ask for the network, either token or the amount in prose. Asking in text instead of calling the tool is a bug.
   - Call 'swap_tokens' again after each answer with that detail added. "Swap on Stellar Mainnet" is the network, "Swap from XLM" the source token, "Receive USDC" the destination, a bare figure the amount.
   - Only once 'swap_tokens' reports every detail is known, call 'stellar_testnet_swap_quote' or 'stellar_mainnet_swap_quote' with those exact values.
   - Skip 'swap_tokens' when the user already gave the network, both tokens and the amount in one sentence — go straight to the quote tool.
13. BRIDGING (cross-chain):
   - "Bridge 20 USDC to XLM", "move my USDC from Base to Stellar" — call 'bridge_tokens' straight away with whatever they gave you.
   - Omit a chain the user did not name; the tool resolves it to where the asset lives.
   - Bridging crosses chains. If both sides are on Stellar it is a swap — use the swap tools instead.
14. If the user asks for multiple pieces of information (e.g., "What's my balance on mainnet and testnet"), call all relevant tools needed to answer.

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
