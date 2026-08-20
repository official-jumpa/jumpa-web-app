import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { generateId } from "@/lib/schema-ids";
import { ChatLog, type IChatMessage } from "@/models/ChatLog";
import { Wallet } from "@/models/Wallet";
import { queryDeepSeekAI } from "@/lib/ai/deepseek";
import {
  getCachedWalletBalances,
  type SupportedChain,
} from "@/lib/wallet-balances";
import type { AssetOption } from "@/lib/chat";

function detectTargetChains(prompt: string): SupportedChain[] | undefined {
  const p = prompt.toLowerCase();
  const chains: SupportedChain[] = [];

  const isStellar = p.includes("stellar") || p.includes("xlm");
  const isSolana = p.includes("solana") || p.includes("sol");
  const isBitcoin = p.includes("bitcoin") || p.includes("btc");
  const isBase = p.includes("base");
  const isEvm =
    p.includes("ethereum") ||
    p.includes("eth") ||
    p.includes("evm") ||
    p.includes("sepolia") ||
    p.includes("polygon") ||
    p.includes("celo") ||
    p.includes("bnb");

  if (isStellar) chains.push("stellar");
  if (isSolana) chains.push("solana");
  if (isBitcoin) chains.push("bitcoin");
  if (isBase && !isEvm) chains.push("base");
  else if (isEvm) chains.push("evm");

  return chains.length > 0 ? chains : undefined;
}

const BASE_RATES: Record<string, number> = {
  "USD-XLM": 5.77,
  "XLM-USD": 1 / 5.77,
  "USDC-XLM": 5.77,
  "XLM-USDC": 1 / 5.77,
  "SOL-USDC": 180.0,
  "USDC-SOL": 1 / 180.0,
  "SOL-USD": 180.0,
  "USD-SOL": 1 / 180.0,
  "BTC-USDC": 95000.0,
  "USDC-BTC": 1 / 95000.0,
  "ETH-USDC": 2700.0,
  "USDC-ETH": 1 / 2700.0,
};

function calculateSwapRate(
  fromToken: string,
  toToken: string,
  fromAmt: number,
) {
  const pair = `${fromToken.toUpperCase()}-${toToken.toUpperCase()}`;
  const rate = BASE_RATES[pair] || 1;
  const toAmount = fromAmt * rate;
  return {
    rateStr: `1 ${fromToken.toUpperCase()} = ${rate < 1 ? rate.toFixed(4) : rate.toFixed(2)} ${toToken.toUpperCase()}`,
    toAmount:
      rate < 1
        ? Number(toAmount.toFixed(4)).toString()
        : Number(toAmount.toFixed(2)).toString(),
  };
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

    // Fetch user wallet
    const wallet = await Wallet.findOne({ userId }).lean();
    const walletAddress = wallet?.address || "";

    // Fetch real live or cached balances (only requested chain if specific)
    const targetChains = detectTargetChains(message);
    const balanceData = await getCachedWalletBalances(userId, targetChains);

    const stellarAddress =
      balanceData?.addresses?.xlm || wallet?.addresses?.xlm || walletAddress;
    const solanaAddress =
      balanceData?.addresses?.sol || wallet?.addresses?.sol || "";
    const baseAddress =
      balanceData?.addresses?.base || wallet?.addresses?.base || "";

    const liveBalances = balanceData?.summary || {
      XLM: "0.00 XLM",
      USDC: "0.00 USDC",
      SOL: "0.00 SOL",
      BTC: "0.00 BTC",
      ETH: "0.00 ETH",
      totalUsd: "$0.00",
    };

    const testnetBalances = balanceData?.testnetSummary || {
      "Stellar Testnet (XLM)": "0.00 XLM",
      "Stellar Testnet (USDC)": "0.00 USDC",
      "Stellar Testnet (USDT)": "0.00 USDT",
    };

    console.log(`[Chat Send] User "${userId}" sent: "${message.trim()}"`);
    console.log("[Chat Send] User multi-chain live balances:", liveBalances);
    console.log(
      "[Chat Send] User multi-chain testnet balances:",
      testnetBalances,
    );

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

    // Prepare context and history for DeepSeek
    const history = (chatLog.messages || []).slice(-8).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content || "",
    }));

    console.log("[Chat Send] Sending prompt to DeepSeek AI...");
    const aiResult = await queryDeepSeekAI({
      prompt: message.trim(),
      history,
      context: {
        walletAddress,
        stellarAddress,
        solanaAddress,
        baseAddress,
        balances: liveBalances,
        testnetBalances,
      },
    });

    console.log(
      `[Chat Send] DeepSeek AI Intent: "${aiResult.intent}" | Message: "${aiResult.message.slice(0, 50)}..."`,
      aiResult.params,
    );

    let assistantMessage: IChatMessage;

    // 1. Swap Intent
    if (aiResult.intent === "SWAP_TOKEN") {
      const fromToken = (aiResult.params.fromToken || "USD").toUpperCase();
      const toToken = (aiResult.params.toToken || "XLM").toUpperCase();
      const fromAmount = String(aiResult.params.fromAmount || "20");
      const numFrom = parseFloat(fromAmount) || 20;

      const { rateStr, toAmount } = calculateSwapRate(
        fromToken,
        toToken,
        numFrom,
      );

      assistantMessage = {
        id: generateId("MSG"),
        role: "assistant",
        content:
          aiResult.message || "Finding you the best rate for your swap...",
        isTransaction: true,
        cardType: "quote",
        status: "pending",
        transactionParams: {
          type: "swap",
          fromToken,
          toToken,
          fromAmount: numFrom.toString(),
          toAmount,
          chain: "stellar",
          currency: fromToken,
        },
        cardData: {
          title: "Swapping",
          status: { lead: "Slippage ", value: "0.5%" },
          pay: {
            caption: "YOU PAY",
            value: numFrom.toString(),
            badge: fromToken,
          },
          receive: { caption: "YOU RECEIVE", value: toAmount, badge: toToken },
          stats: [
            { lead: "Rate ", value: rateStr },
            { lead: "Fee ", value: "0.01 XLM" },
          ],
        },
        timestamp: new Date(),
      };
    }
    // 2. Transfer / Send Intent
    else if (aiResult.intent === "SEND_FUNDS") {
      const amount = String(aiResult.params.amount || "50");
      const token = (aiResult.params.token || "USDC").toUpperCase();
      const recipient = String(aiResult.params.recipient || "@alicej.umpa");
      const recipientName = String(aiResult.params.recipientName || recipient);

      // Build payment options dynamically with user's real liveBalances
      const paymentOptions: AssetOption[] = [
        {
          symbol: token,
          balance: liveBalances[token] || "0.00",
          amount: amount,
          selected: true,
        },
      ];

      if (token !== "XLM") {
        const xlmRate = BASE_RATES[`${token}-XLM`] || 5.77;
        const xlmAmt = (parseFloat(amount) * xlmRate).toFixed(2);
        paymentOptions.push({
          symbol: "XLM",
          balance: liveBalances.XLM || "0.00 XLM",
          amount: isNaN(Number(xlmAmt)) ? "0" : xlmAmt,
          selected: false,
        });
      } else {
        const usdcAmt = (parseFloat(amount) / 5.77).toFixed(2);
        paymentOptions.push({
          symbol: "USDC",
          balance: liveBalances.USDC || "0.00 USDC",
          amount: isNaN(Number(usdcAmt)) ? "0" : usdcAmt,
          selected: false,
        });
      }

      assistantMessage = {
        id: generateId("MSG"),
        role: "assistant",
        content:
          aiResult.message || "I've drafted the transfer details for you:",
        isTransaction: true,
        cardType: "transfer",
        status: "pending",
        transactionParams: {
          type: "transfer",
          amount,
          token,
          chain: "stellar",
          currency: "USD",
          recipient,
          recipientName,
        },
        cardData: {
          contact: {
            name: recipientName,
            handle: recipient.startsWith("@") ? recipient : `@${recipient}`,
            avatar: "/images/chat/contact-alice.webp",
          },
          amount: { caption: "YOU'LL SEND", value: `${amount} ${token}` },
          prompt: "Which asset would you like to use?",
          options: paymentOptions,
        },
        timestamp: new Date(),
      };
    }
    // 3. Onramp / Buy Crypto / Deposit Intent
    else if (aiResult.intent === "ONRAMP_CRYPTO") {
      const fiatAmount = String(aiResult.params.fiatAmount || "150,000");
      const fiatCurrency = (
        aiResult.params.fiatCurrency || "NGN"
      ).toUpperCase();
      const cryptoAmount = String(aiResult.params.cryptoAmount || "100");
      const cryptoToken = (aiResult.params.cryptoToken || "USDC").toUpperCase();

      assistantMessage = {
        id: generateId("MSG"),
        role: "assistant",
        content:
          aiResult.message ||
          "Here are your dedicated bank transfer details to fund your wallet with Naira (NGN):",
        isTransaction: true,
        cardType: "onramp",
        status: "pending",
        transactionParams: {
          type: "onramp",
          fiatAmount,
          fiatCurrency,
          cryptoAmount,
          cryptoToken,
        },
        cardData: {
          title: "Buy Crypto / Deposit",
          fiatAmount,
          fiatCurrency,
          cryptoAmount,
          cryptoToken,
          bankName: "Wema Bank / Moniepoint",
          accountName: "Jumpa Settlement / User Wallet",
          accountNumber: "8291038419",
          reference: "REF-789210",
          status: "pending",
        },
        timestamp: new Date(),
      };
    }
    // 4. Offramp / Cash Out / Withdraw Intent
    else if (aiResult.intent === "OFFRAMP_CRYPTO") {
      const cryptoAmount = String(aiResult.params.cryptoAmount || "50");
      const cryptoToken = (aiResult.params.cryptoToken || "USDC").toUpperCase();
      const fiatAmount = String(aiResult.params.fiatAmount || "75,000");
      const fiatCurrency = (
        aiResult.params.fiatCurrency || "NGN"
      ).toUpperCase();
      const bankName = String(aiResult.params.bankName || "Access Bank");
      const accountNumber = String(
        aiResult.params.accountNumber || "0123456789",
      );
      const accountName = String(aiResult.params.accountName || "John Doe");

      assistantMessage = {
        id: generateId("MSG"),
        role: "assistant",
        content:
          aiResult.message ||
          "I've drafted your withdrawal request to receive Naira (NGN) directly into your bank account:",
        isTransaction: true,
        cardType: "offramp",
        status: "pending",
        transactionParams: {
          type: "offramp",
          cryptoAmount,
          cryptoToken,
          fiatAmount,
          fiatCurrency,
        },
        cardData: {
          title: "Withdrawal",
          cryptoAmount,
          cryptoToken,
          fiatAmount,
          fiatCurrency,
          bankName,
          accountName,
          accountNumber,
          status: "pending",
        },
        timestamp: new Date(),
      };
    }
    // 5. Standard AI Conversation & Balance inquiries
    else {
      assistantMessage = {
        id: generateId("MSG"),
        role: "assistant",
        content:
          aiResult.message?.trim() ||
          "Here are your balance and account details:",
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
