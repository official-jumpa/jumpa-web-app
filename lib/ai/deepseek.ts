export interface AIIntentResult {
  intent:
    | "CHAT"
    | "SWAP_TOKEN"
    | "SEND_FUNDS"
    | "ONRAMP_CRYPTO"
    | "OFFRAMP_CRYPTO"
    | "CHECK_BALANCE";
  message: string;
  params: Record<string, any>;
}

interface QueryDeepSeekOptions {
  prompt: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: {
    walletAddress?: string;
    stellarAddress?: string;
    solanaAddress?: string;
    baseAddress?: string;
    balances?: Record<string, string>;
    testnetBalances?: Record<string, string>;
  };
}

export const buildSystemPrompt = (
  context?: QueryDeepSeekOptions["context"],
) => `
You are Jumpa AI, the intelligent, friendly financial assistant for Jumpa — a modern multi-chain Web3 and fiat neo-banking platform.
Your mission is to understand user intents, answer questions accurately, engage in helpful conversation, and draft financial actions (swaps, transfers, onramps, offramps, balance checks).

### SUPPORTED NETWORKS & ASSETS:
- Stellar: Mainnet (XLM, USDC, USDT) and Testnet (XLM, USDC, USDT)
- Solana: Mainnet only (SOL, USDC, USDT)
- Base / Ethereum / EVM: Mainnet only (ETH, USDC, USDT, BNB, POL, CELO)
- Bitcoin: Mainnet only (BTC)
- Fiat: Nigerian Naira (₦ / NGN), US Dollar ($ / USD)

### CURRENT USER CONTEXT:
- Stellar Address: ${context?.stellarAddress || context?.walletAddress || "Not connected"}
- Solana Address: ${context?.solanaAddress || "Not connected"}
- Base / EVM Address: ${context?.baseAddress || "Not connected"}
- Live Mainnet Balances: ${JSON.stringify(context?.balances || {}, null, 2)}
- Live Testnet Balances (Stellar Testnet): ${JSON.stringify(context?.testnetBalances || {}, null, 2)}
- Current Time: ${new Date().toISOString()}

### INTENT RECOGNITION RULES:
1. "CHECK_BALANCE": User asks about their balance, funds, portfolio, or how much crypto/fiat they have on any chain (e.g. "how much do i have on base", "and solana? 😭", "you said i have funds on stellar testnet?", "check my stellar balance", "what's my net worth").
2. "SWAP_TOKEN": User wants to trade, exchange, or convert tokens (e.g. "swap 20 USD to XLM", "convert 5 SOL to USDC").
3. "SEND_FUNDS": User wants to send, pay, or transfer crypto to someone (e.g. "send 50 USDC to @alice", "transfer 10 SOL to <address>").
4. "ONRAMP_CRYPTO": User wants to add funds, deposit Naira, or buy crypto with bank transfer (e.g. "deposit 50k naira", "buy 100 USDC with NGN", "how do I add money").
5. "OFFRAMP_CRYPTO": User wants to withdraw, cash out, or sell crypto for Naira to a bank account (e.g. "withdraw 50 USDC to GTBank", "cash out 20k naira").
6. "CHAT": Casual conversation, follow-up questions, explanations, greetings, jokes, small talk, emojis, questions about Jumpa features, advice, or general inquiries (e.g. "I'm broke 😔", "what can I do here", "hello", "tell me about Jumpa").

### RESPONSE FORMAT SCHEMA:
You MUST respond with a single, valid JSON object matching this schema:

{
  "intent": "CHAT" | "SWAP_TOKEN" | "SEND_FUNDS" | "ONRAMP_CRYPTO" | "OFFRAMP_CRYPTO" | "CHECK_BALANCE",
  "message": "MANDATORY: A clear, helpful, markdown-formatted response to the user.",
  "params": {}
}

### EXAMPLES:
- User: "I'm broke 😔"
  {"intent": "CHAT", "message": "We've all been there! Whenever you're ready, you can top up your Jumpa wallet with **Nigerian Naira (NGN)** via instant bank transfer or receive crypto to your multi-chain addresses.", "params": {}}

- User: "you said i have funds on stellar testnet?"
  {"intent": "CHECK_BALANCE", "message": "Yes! On **Stellar Testnet**, your wallet has **10,000.00 XLM** available for testing. On **Stellar Mainnet**, your balance is **0.00 XLM**.", "params": {}}

- User: "and solana? 😭"
  {"intent": "CHECK_BALANCE", "message": "On **Solana Mainnet**, your current balance is **0.0000 SOL** ($0.00).", "params": {}}

- User: "what can i do here"
  {"intent": "CHAT", "message": "With **Jumpa**, you can seamlessly:\n\n- **Swap Tokens**: Instant cross-chain swaps between XLM, SOL, ETH, and USDC.\n- **Deposit Fiat**: Fund your wallet in Naira (NGN) with dedicated bank accounts.\n- **Cash Out**: Withdraw crypto directly into any Nigerian bank account in seconds.\n- **Send Money**: Pay anyone using their Jumpa handle (@name) or wallet address.", "params": {}}

- User: "swap 20 USD to XLM"
  {"intent": "SWAP_TOKEN", "message": "Finding you the best rate for swapping 20 USD to XLM...", "params": {"fromToken": "USD", "toToken": "XLM", "fromAmount": "20", "toAmount": "115.4"}}

- User: "send 50 USDC to @alice"
  {"intent": "SEND_FUNDS", "message": "I've drafted the transfer details to send 50 USDC to @alice:", "params": {"amount": "50", "token": "USDC", "recipient": "@alice", "recipientName": "Alice"}}

### RULES:
- The "message" field is **STRICTLY MANDATORY** and must NEVER be empty or null.
- Always use standard Markdown (**bold**, *italics*, \`code\`, bullet lists).
- If the user uses emojis or casual slang, respond warmly and conversationally while staying helpful.
- For Naira amounts, format using '₦' (e.g. ₦50,000).
`;

export async function queryDeepSeekAI({
  prompt,
  history = [],
  context,
}: QueryDeepSeekOptions): Promise<AIIntentResult> {
  const apiKey = process.env.DEEPSEEK_API;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  if (!apiKey) {
    console.warn("[DeepSeek] API Key missing");
    return {
      intent: "CHAT",
      message: "DeepSeek API key is not configured. Running in preview mode.",
      params: {},
    };
  }

  const systemMessage = {
    role: "system",
    content: buildSystemPrompt(context),
  };

  // Build message chain: Ensure previous assistant turns in history are JSON so DeepSeek doesn't suffer format mismatch
  const messages = [
    systemMessage,
    ...history.slice(-8).map((h) => ({
      role: h.role,
      content:
        h.role === "assistant"
          ? JSON.stringify({ intent: "CHAT", message: h.content, params: {} })
          : h.content,
    })),
    {
      role: "user",
      content: prompt,
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
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[DeepSeek API Error]", response.status, errText);
      return {
        intent: "CHAT",
        message: `I encountered an error communicating with the AI service (${response.status}). Please try again in a moment.`,
        params: {},
      };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || "";
    console.log("[DeepSeek Raw AI Output]:", rawContent);

    // Parse JSON safely
    try {
      const parsed = JSON.parse(rawContent);
      const parsedMessage =
        (typeof parsed.message === "string" && parsed.message.trim()) ||
        (typeof parsed.content === "string" && parsed.content.trim()) ||
        (typeof parsed.response === "string" && parsed.response.trim()) ||
        (typeof parsed.text === "string" && parsed.text.trim()) ||
        "";

      let finalMessage = parsedMessage;
      if (!finalMessage) {
        if (parsed.intent === "CHECK_BALANCE") {
          finalMessage = "Here are your balance details:";
        } else if (parsed.intent === "SWAP_TOKEN") {
          finalMessage = "Finding you the best rate for your swap...";
        } else if (parsed.intent === "SEND_FUNDS") {
          finalMessage = "I've drafted the transfer details for you:";
        } else {
          finalMessage =
            "I'm here to help with your balances, swaps, transfers, or any questions about Jumpa!";
        }
      }

      return {
        intent: parsed.intent || "CHAT",
        message: finalMessage,
        params: parsed.params || {},
      };
    } catch {
      // If JSON is wrapped in markdown code block or embedded in text
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const parsedMessage =
            (typeof parsed.message === "string" && parsed.message.trim()) ||
            (typeof parsed.content === "string" && parsed.content.trim()) ||
            (typeof parsed.response === "string" && parsed.response.trim()) ||
            (typeof parsed.text === "string" && parsed.text.trim()) ||
            "";

          return {
            intent: parsed.intent || "CHAT",
            message:
              parsedMessage ||
              rawContent ||
              "I'm here to help with your balances, swaps, transfers, or any questions about Jumpa!",
            params: parsed.params || {},
          };
        } catch {
          // fall through
        }
      }
      return {
        intent: "CHAT",
        message:
          rawContent ||
          "I'm here to help with your balances, swaps, transfers, or any questions about Jumpa!",
        params: {},
      };
    }
  } catch (err) {
    console.error("[DeepSeek Fetch Error]", err);
    return {
      intent: "CHAT",
      message:
        "Sorry, I had trouble reaching the AI network. Please check your connection.",
      params: {},
    };
  }
}
