/**
 * Jumpa AI — Jumpa Agent Client with Function Calling & Multi-Tool Agent Loop
 *
 * The AI decides which tools to call. The server executes them in an iterative loop.
 * Supports parallel tool calls in a single turn and multi-turn sequential tool chaining.
 * Includes DSML parser fallback and sanitizer to guarantee raw model markup never leaks to the user.
 */

import { JUMPA_TOOLS, type ToolCall } from "./tools";
import { environment } from "@/lib/environment";

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

export interface JumpaAgentContext {
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

export function buildSystemPrompt(context?: JumpaAgentContext): string {
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
- Base / EVM Mainnet: ETH, USDC, USDT
- Fiat: Nigerian Naira (NGN / ₦)

### FIAT ONRAMP & OFFRAMP SUPPORTED ASSETS:
- **USDC**: Base ('base:usdc'), Solana ('solana:usdc'), Ethereum ('ethereum:usdc'), Stellar ('stellar:usdc').
- **USDT**: Solana ('solana:usdt'), Ethereum ('ethereum:usdt').
  *(CRITICAL: USDT is NOT supported on Base or Stellar! If the user wants USDT, offer Solana or Ethereum)*.
- **cNGN**: Base ('base:cngn').
- **Stellar**: USDC only ('stellar:usdc'). It settles through Centiiv instead of Switch, which the tool handles — treat it as a normal cash-out network and never tell the user Stellar is unsupported.
- **MAINNET ONLY**: All fiat onramps and offramps operate strictly on MAINNET. Never set or use testnet for fiat ramps.

### TOOL CALLING RULES:
1. You have access to function tools ('send_funds', 'swap_tokens', 'stellar_testnet_swap_quote', 'stellar_mainnet_swap_quote', 'stellar_testnet_balance', 'stellar_mainnet_balance', 'stellar_sep24_sandbox', 'check_portfolio', 'onramp_ngn', 'onramp_ngn_custom', 'offramp_ngn', 'get_ramp_rate', 'claim_faucet', 'create_savings_goal', 'list_savings', 'deposit_savings', 'withdraw_savings', 'bridge_tokens').
2. CHECKING EXCHANGE RATES (FIAT & STABLECOIN RATES):
   - When the user asks for exchange rates, prices, or how much crypto is worth in Naira before buying/selling (e.g. "what are the rates for withdrawing usdc to naira?", "what is the rate for usdt?", "how much is 1 usdc in naira?", "show rates", "what is the onramp rate?"):
   - Call the 'get_ramp_rate' tool immediately!
   - Default to 'direction': "both" and token 'USDC' unless they specifically asked about USDT or a specific flow.
   - Present the rates returned by the tool clearly in your response.
3. STELLAR SEP-24 HOSTED ANCHOR SANDBOX:
   - When the user asks to test, demo, or initialize a Stellar hosted anchor, SEP-24 onramp/offramp, MoneyGram sandbox, or Stellar anchor deposit/withdraw (e.g. "deposit USDC via stellar anchor", "open sep 24 onramp sandbox", "show moneygram onramp"), call 'stellar_sep24_sandbox'.
4. NIGERIAN BANK ACCOUNTS VS ON-CHAIN ADDRESSES:
   - A 10-digit number (e.g. '9169419535', '0123456789') is a Nigerian NUBAN bank account number, NOT a crypto address!
   - If a user says "Send 10 XLM to 9169419535" or asks to transfer crypto to a 10-digit number, recognize this as a bank offramp withdrawal intent (selling crypto for NGN to bank).
   - DO NOT call 'send_funds' with a 10-digit number! Instead, ask the user for their bank name (e.g. GTBank, Kuda, Access Bank) so you can set up the offramp to their bank account, or ask for their Stellar public key (56-character string starting with 'G') if they meant an on-chain transfer.
5. INACTIVE STELLAR ACCOUNTS & FAUCET:
   - If a user has 0 XLM or an unactivated account, explain that on Stellar, accounts must have at least 1 XLM to be active on ledger.
   - For testnet wallets, tell them they can claim free testnet XLM using the faucet (or call 'claim_faucet').
   - When the user asks for test tokens, testnet XLM, or faucet funds, call the 'claim_faucet' tool immediately.
6. MANDATORY: Whenever the user requests an on-chain crypto transfer with amount and valid recipient address/handle (e.g., "send 100 XLM to GB25H...", "transfer 50 USDC to @alice", "send 53 XLM to my wallet"), YOU MUST IMMEDIATELY CALL THE 'send_funds' TOOL.
7. CRITICAL: NEVER hallucinate, invent, or guess transaction amounts or networks!
   - If the user asks to deposit, buy, onramp or send WITHOUT providing an amount (e.g. "I want to deposit naira for usdt"), DO NOT CALL A TOOL. Reply conversationally asking for the amount in Naira or crypto and their preferred network/chain.
   - For onramp / buying crypto:
     * If the user wants to buy **stablecoins** (USDC, USDT, cNGN): call 'onramp_ngn'. Pass 'fiatAmount' or 'cryptoAmount'.
     * If the user wants to buy **XLM** with Naira (e.g. "buy 50 XLM with naira", "deposit ₦10,000 for XLM", "buy XLM"): call 'onramp_ngn_custom' with targetToken='XLM'. Pass 'fiatAmount' or 'cryptoAmount' respectively.
   - Swaps and Bridging are the exceptions: an open-ended swap goes to 'swap_tokens', and bridging goes to 'bridge_tokens', both of which ask with interactive cards (see SWAPPING and BRIDGING below). Never ask for bridge or swap networks or amounts in prose text — always call the tool to display the interactive cards.
   - If the user wants USDT, inform them that USDT is available on Solana or Ethereum (not Base), and ask which network they prefer.
8. NEVER reply with text saying "I have drafted the transfer" or "Just tap Confirm on the card" without executing a tool call! Text responses DO NOT render cards or confirm buttons. You MUST output a tool call for the card to appear.
9. For transfers to "my wallet" or "myself", set 'recipient' to the user's Stellar address from the context above.
10. If the user mentions "testnet" or testing for on-chain transfers, set 'network': "testnet". Default 'chain' to "stellar" for XLM. Note: Fiat ramps (onramp_ngn / offramp_ngn) are NEVER on testnet; they are exclusively mainnet.
11. If a user requests USDT on Stellar, explain that USDT is not available on Stellar networks and offer XLM ↔ USDC.
12. VISUAL INTELLIGENCE & ATTACHED MEDIA:
    - When a user attaches an image, receipt, or payment proof, visual intelligence analysis from Gemini 2.5 Flash is automatically extracted and provided in the turn.
    - Use these extracted details (bank name, account number, beneficiary name, transfer amount, crypto address, status) directly to help the user.
    - If you need to re-inspect or ask a specific question about an image URL, you can also call the 'analyze_image' tool.
12. CASHING OUT (OFFRAMP):
   - When the user wants to cash out, withdraw, or sell crypto for Naira, call 'offramp_ngn' straight away with only what they have told you.
   - FIAT OR CRYPTO AMOUNT: The user can specify EITHER the crypto amount to sell (e.g. "sell 20 USDC", "cash out 15 USDC to my bank") OR the target fiat Naira amount they want in their bank account (e.g. "I want 20,000 naira in my bank account, use my usdc", "send 50,000 NGN to my GTBank using my USDC").
   - If the user specifies a Naira amount (e.g. "20000 naira", "₦20,000"), pass it as 'fiatAmount'. DO NOT attempt to guess, hallucinate, or calculate the crypto amount in chat text! The 'offramp_ngn' tool computes the exact crypto equivalent using live market exchange rates.
   - If the user specifies crypto amount, pass it as 'cryptoAmount'.
   - The tool answers with the chooser for whatever is missing, so DO NOT ask for the token, the network, the account number or the bank in prose. Asking in text instead of calling the tool is a bug.
   - NEVER pick the network yourself. If the user did not name one, omit 'asset' and 'cryptoToken' entirely — the tool reads their balances and offers the chooser. Telling a user their Base (or any other) balance is too low when they never mentioned that chain is a bug.
   - After each answer, call 'offramp_ngn' again with that detail added.
   - A bare 10-digit number (even with spaces, dashes, or a +234/234 phone prefix, e.g. "+2348012345677", "2348012345677", "123 456 7890", "123-456-7890") in reply to a cash-out is the account number; if prefixed with +234 or 234, remove the 234 prefix and use the remaining 10 digits as the account number. A bank name on its own is the bank.
   - NEVER state an exchange rate, a Naira equivalent, or a converted figure that a tool did not hand you. Rates are live and you do not know them. If the tool result carries no rate, give the crypto figure alone and say nothing about naira value — an invented or remembered rate is a bug.
   - Testnet balances are test money. Never quote them, convert them, or count them towards a cash-out.
13. SAVINGS MANAGEMENT (CREATING, LISTING, DEPOSITING, WITHDRAWING):
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
13. BRIDGING (conversational interactive wizard):
   - Jumpa supports cross-chain bridging of **USDC** across **Stellar**, **Base**, and **Ethereum** (Mainnet) via Circle CCTP v2 with automated relaying.
   - When the user asks to bridge or mentions bridging (e.g. "I want to bridge", "bridge", "bridge funds", "bridge tokens", "bridge USDC"):
     CALL 'bridge_tokens' IMMEDIATELY.
   - NEVER ask for the source network, destination network, or amount in chat prose! If ANY detail is missing, you MUST STILL call 'bridge_tokens' with whatever details are already known — 'bridge_tokens' will automatically display the next interactive card (source chain picker, destination chain picker, or amount chooser card with prelisted amounts and custom input) on screen.
   - When the user replies with a source chain, destination chain, or amount, you MUST call 'bridge_tokens' with the accumulated parameters ('fromChain', 'toChain', 'amount'). Do NOT ask "how much" or "which network" in prose text — always call 'bridge_tokens'.
   - ONLY once all three details ('fromChain', 'toChain', and 'amount') are provided, 'bridge_tokens' presents the live confirmation Bridge card. Tell the user to review and confirm. Do NOT use emojis.
   - Bridging is strictly cross-chain USDC. If both sides sit on the same chain, it is a swap — use the swap tools instead.
14. If the user asks for multiple pieces of information (e.g., "What's my balance on mainnet and testnet"), call all relevant tools needed to answer.

### FORMATTING & TONE:
- NEVER use emojis in any response (no 🚀, 😄, 👍, etc.).
- Keep responses short, direct, and concise (1-2 sentences max for follow-ups).
- For follow-ups after a transaction tool call (quote, bridge, send, offramp, onramp), DIRECT the user to review the quote/card and confirm to proceed (e.g. "Here is your quote. Please review the details and confirm to proceed."). DO NOT retype, repeat, or list out the rates, fees, slippage, provider, or amounts that are already displayed inside the card!
- DO NOT mention UI buttons, PINs, or clicking (do NOT say "tap Confirm", "click", or "enter your PIN").
- When figures are mentioned in conversational answers, put EVERY figure in **bold** — amounts, balances, fiat values, rates, fees, percentages, durations — with its unit inside the bold ("**0.18 USDC**", "**₦250**", "**0.00 USDC**", "**30 days**"). Token and network names stay bold too.
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

function handleChoiceResponse(choice: any): AIStepResponse {
  if (!choice) {
    return {
      mode: "chat",
      message: "I didn't get a response. Could you try sending it again?",
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
          "[JumpaAgent] Failed to parse tool args:",
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
        `[JumpaAgent] Structured tool calls received (${toolCalls.length}):`,
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
      `[JumpaAgent] Extracted ${dsmlCalls.length} tool calls from DSML markup:`,
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
}

/**
 * Execute a single step with Jumpa Agent (OpenRouter).
 * Can return either chat text or 1+ tool calls to execute.
 */
export async function runAgentStep(options: {
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

  const openRouterKey =
    process.env.OPENROUTER_API_KEY || environment.OPENROUTER_API_KEY;
  const deepseekApiKey = process.env.DEEPSEEK_API;
  const apiKey = openRouterKey || deepseekApiKey;

  if (!apiKey) {
    console.warn("[AI AGENT] API key missing");
    return {
      mode: "chat",
      message: "An error occurred. Please try again in a moment.",
    };
  }

  const model = openRouterKey
    ? process.env.OPENROUTER_CHAT_MODEL || "deepseek/deepseek-chat"
    : process.env.DEEPSEEK_MODEL || "deepseek-chat";

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

    const endpoint = openRouterKey
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.deepseek.com/chat/completions";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(openRouterKey
            ? {
                "HTTP-Referer": "https://usejumpa.com",
                "X-Title": "Jumpa",
              }
            : {}),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("[AI Gateway API Error]", response.status, errText);
      return {
        mode: "chat",
        message: "An error occurred. Please try again.",
      };
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    return handleChoiceResponse(choice);
  } catch (err) {
    console.error("[JumpaAgent Fetch Error]", err);
    return {
      mode: "chat",
      message:
        "Sorry, I ran into a connection error. Please check your internet and try again.",
    };
  }
}
