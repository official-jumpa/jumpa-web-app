import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { generateId } from "@/lib/schema-ids";
import { ChatLog, type IChatMessage } from "@/models/ChatLog";
import { Wallet } from "@/models/Wallet";

/**
 * Generates a mock AI assistant response with rich Markdown formatting
 * for general conversation.
 */
function generateMockResponse(prompt: string): string {
  const p = prompt.toLowerCase();

  if (
    p.includes("balance") ||
    p.includes("portfolio") ||
    p.includes("wallet")
  ) {
    return `Here is a summary of your connected multi-chain wallet:

- **Native Assets**: Solana (SOL), Stellar (XLM), Ethereum/Base (ETH), Bitcoin (BTC)
- **Stablecoins**: USDC, USDT
- **Settlement**: Instant

You can track your live balance anytime on your **Home** dashboard.`;
  }

  if (
    p.includes("invest") ||
    p.includes("analyze") ||
    p.includes("suggestion")
  ) {
    return `Here are some insights based on current market metrics:

1. **Dollar-Cost Averaging (DCA)**: Consider setting up recurring deposits into stable yield assets.
2. **Diversification**: Split between **Layer 1 natives** (SOL, ETH) and **Stablecoins** (USDC).
3. **Liquidity**: Keep sufficient reserve for network transaction fees.`;
  }

  return `Got it! I received your message:

 "${prompt}"

I am currently running in preview mode with full database synchronization. Soon, I will be connected to our **Claude AI Engine** to execute autonomous trades, onramps, and multi-chain payments!`;
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

    // Fetch user wallet address if available
    const wallet = await Wallet.findOne({ userId }).lean();
    const walletAddress = wallet?.address || "";

    let chatLog: any = null;

    if (sessionId) {
      chatLog = await ChatLog.findOne({ _id: sessionId, userId });
    }

    // If no existing session, create a new one
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

    const p = message.toLowerCase();
    let assistantMessage: IChatMessage;

    // Check for Swap Intent
    if (p.includes("swap") || p.includes("exchange")) {
      assistantMessage = {
        id: generateId("MSG"),
        role: "assistant",
        content: "Finding you the best rate...",
        isTransaction: true,
        cardType: "quote",
        status: "pending",
        transactionParams: {
          type: "swap",
          fromToken: "USD",
          toToken: "XLM",
          fromAmount: "20",
          toAmount: "115.4",
          chain: "stellar",
          currency: "USD",
        },
        cardData: {
          title: "Swapping",
          status: { lead: "Slippage ", value: "0.5%" },
          pay: { caption: "YOU PAY", value: "20", badge: "USD" },
          receive: { caption: "YOU RECEIVE", value: "115.4", badge: "XLM" },
          stats: [
            { lead: "Rate ", value: "1 USD = 5.77 XLM" },
            { lead: "Fee ", value: "0.01 XLM" },
          ],
        },
        timestamp: new Date(),
      };
    }
    // Check for Transfer / Send Intent
    else if (
      p.includes("send") ||
      p.includes("transfer") ||
      p.includes("pay")
    ) {
      assistantMessage = {
        id: generateId("MSG"),
        role: "assistant",
        content: "I've drafted the transfer details for you:",
        isTransaction: true,
        cardType: "transfer",
        status: "pending",
        transactionParams: {
          type: "transfer",
          amount: "50",
          token: "USDC",
          chain: "stellar",
          currency: "USD",
          recipient: "@alicej.umpa",
          recipientName: "Alice Jumpa",
        },
        cardData: {
          contact: {
            name: "Alice Jumpa",
            handle: "@alicej.umpa",
            avatar: "/images/chat/contact-alice.webp",
          },
          amount: { caption: "YOU'LL SEND", value: "50 USD" },
          prompt: "Which asset would you like to use?",
          options: [
            {
              symbol: "USDC",
              balance: "$450.50",
              amount: "50.00",
              selected: true,
            },
            { symbol: "XLM", balance: "225.43", amount: "154" },
          ],
        },
        timestamp: new Date(),
      };
    }
    // Check for Onramp / Deposit / Add Funds Intent
    else if (
      p.includes("add fund") ||
      p.includes("add funds") ||
      p.includes("cash in") ||
      p.includes("deposit") ||
      p.includes("fund wallet") ||
      p.includes("fund") ||
      p.includes("buy crypto")
    ) {
      assistantMessage = {
        id: generateId("MSG"),
        role: "assistant",
        content:
          "Here are your dedicated bank transfer details to fund your wallet with Naira (NGN):",
        isTransaction: true,
        cardType: "onramp",
        status: "pending",
        transactionParams: {
          type: "onramp",
          fiatAmount: "150,000",
          fiatCurrency: "NGN",
          cryptoAmount: "100",
          cryptoToken: "USDC",
        },
        cardData: {
          title: "Buy Crypto / Deposit",
          fiatAmount: "150,000",
          fiatCurrency: "NGN",
          cryptoAmount: "100",
          cryptoToken: "USDC",
          bankName: "Wema Bank / Moniepoint",
          accountName: "Jumpa Settlement / User Wallet",
          accountNumber: "8291038419",
          reference: "REF-789210",
          status: "pending",
        },
        timestamp: new Date(),
      };
    }
    // Check for Offramp / Cash Out / Withdraw Intent
    else if (
      p.includes("cash out") ||
      p.includes("withdraw") ||
      p.includes("offramp") ||
      p.includes("sell")
    ) {
      assistantMessage = {
        id: generateId("MSG"),
        role: "assistant",
        content:
          "I've drafted your withdrawal request to receive Naira (NGN) directly into your bank account:",
        isTransaction: true,
        cardType: "offramp",
        status: "pending",
        transactionParams: {
          type: "offramp",
          cryptoAmount: "50",
          cryptoToken: "USDC",
          fiatAmount: "75,000",
          fiatCurrency: "NGN",
        },
        cardData: {
          title: "Withdrawal",
          cryptoAmount: "50",
          cryptoToken: "USDC",
          fiatAmount: "75,000",
          fiatCurrency: "NGN",
          bankName: "Access Bank",
          accountName: "John Doe",
          accountNumber: "0123456789",
          status: "pending",
        },
        timestamp: new Date(),
      };
    }
    // Standard Conversation
    else {
      assistantMessage = {
        id: generateId("MSG"),
        role: "assistant",
        content: generateMockResponse(message),
        cardType: "text",
        timestamp: new Date(),
      };
    }

    chatLog.messages.push(userMessage);
    chatLog.messages.push(assistantMessage);

    // If title is still default "New Chat", update it with the first message
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
