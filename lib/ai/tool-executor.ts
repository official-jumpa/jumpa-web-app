/**
 * Jumpa AI — Tool Executor
 *
 * Executes tool calls dispatched by the DeepSeek AI.
 * Each tool is network-scoped — the tool name is the source of truth for chain/network.
 * Returns both structured card data and a plain-text summary for the AI's follow-up response.
 */

import { getSwapQuote } from "@/lib/dex";
import { fetchStellarBalances } from "@/lib/chains/stellar/account";
import type { SwapQuote } from "@/lib/dex/types";
import {
  getNetworkFromToolName,
  type JumpaToolName,
} from "./tools";

export type CardHint =
  | { type: "quote"; data: QuoteCardData }
  | { type: "transfer"; data: Record<string, any> }
  | { type: "onramp"; data: Record<string, any> }
  | { type: "offramp"; data: Record<string, any> }
  | { type: "none" };

export interface QuoteCardData {
  title: string;
  status: { lead: string; value: string };
  pay: { caption: string; value: string; badge: string };
  receive: { caption: string; value: string; badge: string };
  stats: Array<{ lead?: string; value: string }>;
  _rawQuote: SwapQuote;
  network: "testnet" | "mainnet";
  chain: string;
}

export interface ToolResult {
  toolName: string;
  /** Plain-text summary sent back to the AI for its follow-up message */
  summaryForAI: string;
  /** Structured card data for the UI (if applicable) */
  cardHint: CardHint;
  /** Transaction params if this result requires a confirmation flow */
  transactionParams?: Record<string, any>;
  /** Whether this result needs user confirmation (PIN flow) */
  requiresConfirmation: boolean;
}

/**
 * Execute a tool call from the AI and return a ToolResult.
 * @param toolName  - The function name the AI called
 * @param toolArgs  - The parsed arguments object
 * @param userCtx   - Runtime context (user addresses, etc.)
 */
export async function executeTool(
  toolName: string,
  toolArgs: Record<string, any>,
  userCtx: {
    stellarAddress: string;
  },
): Promise<ToolResult> {
  const name = toolName as JumpaToolName;

  switch (name) {
    // ── Stellar Testnet Swap Quote 
    case "stellar_testnet_swap_quote":
    case "stellar_mainnet_swap_quote": {
      const network = getNetworkFromToolName(name);
      const { fromToken, toToken, fromAmount } = toolArgs as {
        fromToken: string;
        toToken: string;
        fromAmount: string;
      };

      let quote: SwapQuote;
      try {
        quote = await getSwapQuote({
          chain: "stellar",
          assetIn: fromToken,
          assetOut: toToken,
          amount: fromAmount,
          slippageTolerance: 0.5,
          network,
        });
      } catch (err: any) {
        const msg =
          err?.message?.includes("liquidity") ||
          err?.message?.includes("few_offers")
            ? `There isn't enough liquidity in the Stellar ${network} orderbook for **${fromAmount} ${fromToken} → ${toToken}**. Try a smaller amount like **5–10 ${fromToken}**.`
            : `Failed to fetch a swap quote on Stellar ${network}: ${err?.message || "Unknown error"}. The pair may not be tradeable right now.`;
        return {
          toolName: name,
          summaryForAI: msg,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      const cardData: QuoteCardData = {
        title: `Swapping (${quote.protocol})`,
        status: { lead: "Slippage ", value: quote.slippage },
        pay: { caption: "YOU PAY", value: quote.amountIn, badge: fromToken },
        receive: {
          caption: "YOU RECEIVE",
          value: quote.amountOut,
          badge: toToken,
        },
        stats: [
          { lead: "Rate ", value: quote.rate },
          { lead: "Est. Fee ", value: quote.estimatedFee },
          {
            lead: "Min Received ",
            value: `${quote.minimumReceived} ${toToken}`,
          },
        ],
        _rawQuote: quote,
        network,
        chain: "stellar",
      };

      return {
        toolName: name,
        summaryForAI: [
          `Quote fetched successfully for Stellar ${network}:`,
          `- Swap: ${quote.amountIn} ${fromToken} → ${quote.amountOut} ${toToken}`,
          `- Rate: ${quote.rate}`,
          `- Slippage: ${quote.slippage}`,
          `- Est. Fee: ${quote.estimatedFee}`,
          `- Min Received: ${quote.minimumReceived} ${toToken}`,
          `- Protocol: ${quote.protocol}`,
          `The quote card has been shown to the user. Ask them to confirm if they'd like to proceed.`,
        ].join("\n"),
        cardHint: { type: "quote", data: cardData },
        transactionParams: {
          type: "swap",
          fromToken,
          toToken,
          fromAmount: quote.amountIn,
          toAmount: quote.amountOut,
          chain: "stellar",
          network,
          currency: fromToken,
          protocol: quote.protocol,
        },
        requiresConfirmation: true,
      };
    }

    // ── Stellar Balance 
    case "stellar_testnet_balance":
    case "stellar_mainnet_balance": {
      const network = getNetworkFromToolName(name);
      const { stellarAddress } = userCtx;

      if (!stellarAddress || !stellarAddress.startsWith("G")) {
        return {
          toolName: name,
          summaryForAI: "The user does not have a Stellar wallet connected.",
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      let balances: { native: string; usdc: string; usdt: string };
      try {
        const result = await fetchStellarBalances(stellarAddress);
        balances = network === "testnet" ? result.testnet : result.mainnet;
      } catch {
        return {
          toolName: name,
          summaryForAI: `Failed to fetch Stellar ${network} balance. The account may not be activated yet.`,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      return {
        toolName: name,
        summaryForAI: [
          `Stellar ${network} balances for ${stellarAddress}:`,
          `- XLM: ${balances.native} XLM`,
          `- USDC: ${balances.usdc} USDC`,
        ].join("\n"),
        cardHint: { type: "none" },
        requiresConfirmation: false,
      };
    }

    // ── Portfolio 
    case "check_portfolio": {
      return {
        toolName: name,
        summaryForAI:
          "Portfolio balances are available in the user context. Use the balances already provided in the system prompt to answer the user.",
        cardHint: { type: "none" },
        requiresConfirmation: false,
      };
    }

    // ── Send Funds 
    case "send_funds": {
      const amount = String(toolArgs.amount || "0");
      const token = String(toolArgs.token || "XLM").toUpperCase();
      const chain = String(toolArgs.chain || "stellar").toLowerCase();
      const network = (toolArgs.network || "testnet") as "testnet" | "mainnet";
      
      let recipient = String(toolArgs.recipient || "").trim();
      if (!recipient || recipient.toLowerCase().includes("my wallet") || recipient.toLowerCase().includes("myself")) {
        recipient = userCtx.stellarAddress;
      }

      const cardData = {
        contact: {
          name: recipient.length > 20 ? `${recipient.slice(0, 8)}...${recipient.slice(-6)}` : recipient,
          handle: recipient.startsWith("G") ? `${recipient.slice(0, 6)}...${recipient.slice(-6)}` : recipient.startsWith("@") ? recipient : `@${recipient}`,
          avatar: "/images/chat/contact-alice.webp",
        },
        amount: { caption: "YOU'LL SEND", value: `${amount} ${token}` },
        prompt: "Confirm transfer details",
        options: [{ symbol: token, balance: "—", amount, selected: true }],
      };

      return {
        toolName: name,
        summaryForAI: `Transfer card has been rendered on-screen for sending ${amount} ${token} to ${recipient} on Stellar ${network}. Instruct the user to tap 'Confirm' or enter their PIN in the card on screen to execute the transfer on-chain.`,
        cardHint: { type: "transfer", data: cardData },
        transactionParams: {
          type: "transfer",
          amount,
          token,
          chain,
          network,
          recipient,
        },
        requiresConfirmation: true,
      };
    }

    // ── Onramp NGN ‼️ still mocked
    case "onramp_ngn": {
      const { fiatAmount, cryptoToken } = toolArgs as {
        fiatAmount: string;
        cryptoToken: string;
      };

      const cardData = {
        title: "Buy Crypto / Deposit",
        fiatAmount,
        fiatCurrency: "NGN",
        cryptoAmount: "—",
        cryptoToken,
        bankName: "Wema Bank / Moniepoint",
        accountName: "Jumpa Settlement",
        accountNumber: "8291038419",
        reference: `REF-${Date.now().toString().slice(-6)}`,
        status: "pending",
      };

      return {
        toolName: name,
        summaryForAI: `Onramp details generated: deposit ₦${fiatAmount} to receive ${cryptoToken}. Bank details shown to user.`,
        cardHint: { type: "onramp", data: cardData },
        transactionParams: {
          type: "onramp",
          fiatAmount,
          fiatCurrency: "NGN",
          cryptoToken,
        },
        requiresConfirmation: true,
      };
    }

    // ── Offramp NGN  ‼️ still mocked
    case "offramp_ngn": {
      const { cryptoAmount, cryptoToken, bankName, accountNumber, accountName } =
        toolArgs as {
          cryptoAmount: string;
          cryptoToken: string;
          bankName: string;
          accountNumber: string;
          accountName: string;
        };

      const cardData = {
        title: "Withdrawal",
        cryptoAmount,
        cryptoToken,
        fiatAmount: "—",
        fiatCurrency: "NGN",
        bankName,
        accountName,
        accountNumber,
        status: "pending",
      };

      return {
        toolName: name,
        summaryForAI: `Offramp draft created: sell ${cryptoAmount} ${cryptoToken} → NGN to ${bankName} account ${accountNumber}. Withdrawal card shown.`,
        cardHint: { type: "offramp", data: cardData },
        transactionParams: {
          type: "offramp",
          cryptoAmount,
          cryptoToken,
          fiatCurrency: "NGN",
        },
        requiresConfirmation: true,
      };
    }

    default:
      return {
        toolName,
        summaryForAI: `Unknown tool: ${toolName}. Could not execute.`,
        cardHint: { type: "none" },
        requiresConfirmation: false,
      };
  }
}
