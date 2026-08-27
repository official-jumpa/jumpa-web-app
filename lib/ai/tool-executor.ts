/**
 * Jumpa AI — Tool Executor
 *
 * Executes tool calls dispatched by the DeepSeek AI.
 * Each tool is network-scoped — the tool name is the source of truth for chain/network.
 * Returns both structured card data and a plain-text summary for the AI's follow-up response.
 */

import { getSwapQuote } from "@/lib/dex";
import { fetchStellarBalances, fundTestnetAccount } from "@/lib/chains/stellar";
import { SwitchService } from "@/lib/switch";
import { resolveBankCode } from "@/lib/switch-banks";
import { findPaystackBank, validateAccountNumber } from "@/lib/paystack";
import { connectDB } from "@/lib/db";
import { Transaction } from "@/models/Transaction";
import { Wallet } from "@/models/Wallet";
import { User } from "@/models/User";
import type { SwapQuote } from "@/lib/dex/types";
import { getNetworkFromToolName, type JumpaToolName } from "./tools";

export type CardHint =
  | { type: "quote"; data: QuoteCardData }
  | { type: "transfer"; data: Record<string, any> }
  | { type: "onramp"; data: Record<string, any> }
  | { type: "offramp"; data: Record<string, any> }
  | { type: "sep24"; data: Record<string, any> }
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

function mapAssetToTxChain(
  asset: string,
): "stellar" | "solana" | "base" | "eth" | "btc" {
  const c = (asset.split(":")[0] || "base").toLowerCase();
  if (c === "solana") return "solana";
  if (c === "stellar") return "stellar";
  if (c === "ethereum" || c === "eth") return "eth";
  if (c === "bitcoin" || c === "btc") return "btc";
  return "base";
}

/**
 * Execute a tool call from the AI and return a ToolResult.
 * @param toolName  - The function name the AI called
 * @param toolArgs  - The parsed arguments object
 * @param userCtx   - Runtime context (user addresses, authenticated userId, etc.)
 */
export async function executeTool(
  toolName: string,
  toolArgs: Record<string, any>,
  userCtx: {
    stellarAddress: string;
    userId?: string;
  },
): Promise<ToolResult> {
  const name = toolName as JumpaToolName;
  const userId = userCtx.userId || "UNKNOWN";

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
          `The quote card has been shown to the user. Ask them to confirm to proceed. Do NOT use emojis or instruct them to click buttons or enter PINs.`,
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
      const providedAddress = String(toolArgs.address || "").trim();
      const targetAddress =
        providedAddress.startsWith("G") && providedAddress.length === 56
          ? providedAddress
          : userCtx.stellarAddress;

      if (!targetAddress || !targetAddress.startsWith("G")) {
        return {
          toolName: name,
          summaryForAI: "Invalid Stellar public key.",
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      let balances: { native: string; usdc: string; usdt: string };
      try {
        const result = await fetchStellarBalances(targetAddress);
        balances = network === "testnet" ? result.testnet : result.mainnet;
      } catch {
        return {
          toolName: name,
          summaryForAI: `Failed to fetch Stellar ${network} balance for ${targetAddress}. The account may not be activated yet.`,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      return {
        toolName: name,
        summaryForAI: [
          `Stellar ${network} balances for ${targetAddress}:`,
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
      if (
        !recipient ||
        recipient.toLowerCase().includes("my wallet") ||
        recipient.toLowerCase().includes("myself")
      ) {
        recipient = userCtx.stellarAddress;
      }

      console.log(`[ToolExecutor] [User: ${userId}] send_funds draft:`, {
        amount,
        token,
        recipient,
        chain,
        network,
      });

      const cardData = {
        title: "Transfer Funds",
        contact: {
          name:
            recipient.length > 20
              ? `${recipient.slice(0, 8)}...${recipient.slice(-6)}`
              : recipient,
          handle: recipient.startsWith("G")
            ? `${recipient.slice(0, 6)}...${recipient.slice(-6)}`
            : recipient.startsWith("@")
              ? recipient
              : `@${recipient}`,
          avatar:
            "https://res.cloudinary.com/dyedbeksr/image/upload/v1763964534/Group_1000003624_nrunnu.png",
        },
        amount: { caption: "YOU'LL SEND", value: `${amount} ${token}` },
        prompt: "Confirm transfer details",
        options: [{ symbol: token, balance: "—", amount, selected: true }],
      };

      return {
        toolName: name,
        summaryForAI: `Transfer card shown for sending ${amount} ${token} to ${recipient} on Stellar ${network}. Tell the user to confirm to proceed. Do NOT use emojis or instruct them to click buttons or enter PINs.`,
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

    // ── SEP-24 Hosted Anchor Sandbox
    case "stellar_sep24_sandbox": {
      const { assetCode = "USDC", type = "deposit", amount = "50", anchorName = "MoneyGram / TestAnchor" } = toolArgs as {
        assetCode?: string;
        type?: "deposit" | "withdraw";
        amount?: string;
        anchorName?: string;
      };

      let stellarAddress = userCtx?.stellarAddress;
      let userName = "Jumpa User";
      let userEmail = "user@jumpa.cash";

      if (userId) {
        const [wallet, user] = await Promise.all([
          Wallet.findOne({ userId }),
          User.findOne({ $or: [{ _id: userId }, { id: userId }] }),
        ]);

        if (!stellarAddress && wallet) {
          stellarAddress = wallet.addresses?.xlm || wallet.address;
        }
        if (user) {
          if (user.name) userName = user.name;
          if (user.email) userEmail = user.email;
        }
      }

      if (!stellarAddress) {
        stellarAddress = "GB25HBRJWZBPWKKGXW5BAOWYFUENSV5JHVDAS4TA43FULA4WU2QJDYMZ";
      }

      const cardData = {
        anchorName,
        assetCode,
        account: stellarAddress,
        userName,
        userEmail,
        type,
        amount,
      };

      return {
        toolName: "stellar_sep24_sandbox",
        summaryForAI:
          `Initialized sandboxed SEP-24 ${type} interactive window for ${amount} ${assetCode} via ${anchorName} on Stellar Testnet for account ${stellarAddress}. ` +
          `The interactive sandbox UI Sheet is now ready for user interaction.`,
        cardHint: {
          type: "sep24",
          data: cardData,
        },
        requiresConfirmation: false,
      };
    }

    // ── Onramp NGN — powered by Switch
    case "onramp_ngn": {
      const { fiatAmount, cryptoToken, asset, walletAddress } = toolArgs as {
        fiatAmount: string;
        cryptoToken: string;
        asset: string;
        walletAddress: string;
      };

      console.log(`[ToolExecutor] [User: ${userId}] onramp_ngn →`, {
        fiatAmount,
        cryptoToken,
        asset,
        walletAddress,
      });

      let cardData;
      let summaryForAI: string;

      try {
        const amount = Number(fiatAmount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error("Invalid fiatAmount");
        }

        const result = await SwitchService.initiateOnRamp(
          amount,
          asset,
          walletAddress,
          false,
        );
        console.log(
          `[ToolExecutor] [User: ${userId}] onramp_ngn ← Switch result:`,
          result,
        );

        if (!result.success || !result.data) {
          throw new Error(result.message || "Switch onramp failed");
        }

        const { deposit, reference, destination } = result.data;

        // Record in ledger tied to authenticated user
        try {
          await connectDB();
          await Transaction.create({
            userId,
            type: "ONRAMP",
            status: "PENDING",
            chain: mapAssetToTxChain(asset),
            network: "mainnet",
            fromAddress: "SWITCH_NGN_BANK",
            toAddress: walletAddress,
            amount: String(destination.amount),
            token: cryptoToken || asset.split(":")[1]?.toUpperCase() || "USDC",
            txHash: reference,
            feePaid: "0",
            rampDetails: {
              provider: "switch",
              fiatCurrency: "NGN",
              fiatAmount: amount,
              reference,
            },
            executedAt: new Date(),
          });
          console.log(
            `[ToolExecutor] [User: ${userId}] Transaction saved: ${reference}`,
          );
        } catch (dbErr: any) {
          console.warn(
            `[ToolExecutor] [User: ${userId}] DB record notice:`,
            dbErr.message,
          );
        }

        cardData = {
          title: "Buy Crypto / Deposit",
          fiatAmount,
          fiatCurrency: "NGN",
          cryptoAmount: String(destination.amount),
          cryptoToken,
          bankName: deposit.bank_name,
          accountName: deposit.account_name,
          accountNumber: deposit.account_number,
          reference,
          asset,
          notes: deposit.note,
          status: "pending",
        };

        summaryForAI =
          `Onramp initiated via Switch. User should transfer ₦${fiatAmount} to ${deposit.bank_name} ` +
          `account ${deposit.account_number} (${deposit.account_name}). ` +
          `They will receive ${destination.amount} ${cryptoToken} on ${asset.split(":")[0]}. ` +
          `Reference: ${reference}.`;

        return {
          toolName: name,
          summaryForAI,
          cardHint: { type: "onramp", data: cardData },
          transactionParams: {
            type: "onramp",
            fiatAmount,
            fiatCurrency: "NGN",
            cryptoToken,
            asset,
          },
          requiresConfirmation: true,
        };
      } catch (err: any) {
        console.error(
          `[ToolExecutor] [User: ${userId}] onramp_ngn ✗ Error:`,
          err.message,
        );
        return {
          toolName: name,
          summaryForAI: `Failed to initiate onramp: ${err.message}`,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }
    }

    // ── Offramp NGN — powered by Switch + Paystack Account Verification
    case "offramp_ngn": {
      const {
        cryptoAmount,
        cryptoToken,
        asset,
        bankName,
        accountNumber,
        holderName,
      } = toolArgs as {
        cryptoAmount: string;
        cryptoToken: string;
        asset: string;
        bankName: string;
        accountNumber: string;
        holderName?: string;
      };

      console.log(`[ToolExecutor] [User: ${userId}] offramp_ngn →`, {
        cryptoAmount,
        cryptoToken,
        asset,
        bankName,
        accountNumber,
        providedHolderName: holderName,
      });

      try {
        if (!bankName || !bankName.trim()) {
          throw new Error("Bank name is required. Please provide your bank name (e.g. GTBank, Kuda, Access Bank, OPay, Zenith).");
        }

        const cleanAccount = String(accountNumber || "").trim().replace(/\D/g, "");
        if (cleanAccount.length !== 10) {
          throw new Error(`Invalid account number "${accountNumber}". Nigerian bank account numbers must be exactly 10 digits.`);
        }

        // 1. Identify Paystack bank
        const paystackBank = findPaystackBank(bankName);
        if (!paystackBank) {
          throw new Error(
            `Could not find bank matching "${bankName}". Please check the bank name (e.g. GTBank, Access Bank, Kuda, Zenith, OPay).`,
          );
        }

        console.log(
          `[ToolExecutor] [User: ${userId}] Matched Paystack Bank: "${paystackBank.name}" (${paystackBank.code})`,
        );

        // 2. Validate account number with Paystack to retrieve verified name
        const resolveRes = await validateAccountNumber(cleanAccount, paystackBank.code);
        if (!resolveRes || !resolveRes.status || !resolveRes.data?.account_name) {
          console.warn(
            `[ToolExecutor] [User: ${userId}] Paystack verification failed:`,
            resolveRes?.message,
          );
          throw new Error(
            `Could not verify account number ${cleanAccount} with ${paystackBank.name}. Please ensure the 10-digit account number and bank name are correct.`,
          );
        }

        const verifiedHolderName = resolveRes.data.account_name.trim();
        console.log(
          `[ToolExecutor] [User: ${userId}] ✅ Paystack account verified: "${verifiedHolderName}" (${cleanAccount})`,
        );

        // 3. Resolve Switch bank code for Switch offramp (never use Paystack bank code for Switch!)
        const switchBank =
          resolveBankCode(bankName) ||
          resolveBankCode(paystackBank.name);

        if (!switchBank) {
          throw new Error(
            `Bank "${paystackBank.name}" could not be matched with our settlement partner (Switch). Please check bank name.`,
          );
        }

        console.log(
          `[ToolExecutor] [User: ${userId}] Matched Switch Bank: "${switchBank.name}" (${switchBank.code})`,
        );

        const amount = Number(cryptoAmount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error("Invalid cryptoAmount");
        }

        // 4. Initiate offramp order with Switch using the verified account name
        const result = await SwitchService.initiateOfframp(
          amount,
          asset,
          {
            holder_name: verifiedHolderName,
            account_number: cleanAccount,
            bank_code: switchBank.code,
          },
          false,
        );

        console.log(
          `[ToolExecutor] [User: ${userId}] offramp_ngn ← Switch result:`,
          result,
        );

        if (!result.success || !result.data) {
          throw new Error(result.message || "Switch offramp failed");
        }

        const { deposit, reference, destination } = result.data;

        // Record in ledger tied to authenticated user
        try {
          await connectDB();
          await Transaction.create({
            userId,
            type: "OFFRAMP",
            status: "PENDING",
            chain: mapAssetToTxChain(asset),
            network: "mainnet",
            fromAddress: "USER_WALLET",
            toAddress: `${paystackBank.name} / ${cleanAccount} (${verifiedHolderName})`,
            amount: String(deposit.amount),
            token: cryptoToken || asset.split(":")[1]?.toUpperCase() || "USDC",
            txHash: reference,
            feePaid: "0",
            rampDetails: {
              provider: "switch",
              fiatCurrency: "NGN",
              fiatAmount: destination.amount,
              reference,
              verifiedAccountName: verifiedHolderName,
              bankName: paystackBank.name,
              accountNumber: cleanAccount,
              depositAddress: deposit.address,
            },
            executedAt: new Date(),
          });
          console.log(
            `[ToolExecutor] [User: ${userId}] Transaction saved: ${reference}`,
          );
        } catch (dbErr: any) {
          console.warn(
            `[ToolExecutor] [User: ${userId}] DB record notice:`,
            dbErr.message,
          );
        }

        const cardData = {
          title: "Withdrawal",
          cryptoAmount: String(deposit.amount),
          cryptoToken: cryptoToken || asset.split(":")[1]?.toUpperCase() || "USDC",
          fiatAmount: String(destination.amount),
          fiatCurrency: "NGN",
          bankName: paystackBank.name,
          accountName: verifiedHolderName,
          accountNumber: cleanAccount,
          depositAddress: deposit.address,
          asset,
          reference,
          status: "pending",
        };

        const summaryForAI =
          `Offramp draft created for ${deposit.amount} ${cardData.cryptoToken} via Switch. ` +
          `Account verified via Paystack as **${verifiedHolderName}** (${paystackBank.name} - ${cleanAccount}). ` +
          `The user will receive **₦${destination.amount.toLocaleString()}**. ` +
          `Ask the user to confirm to proceed with the withdrawal. Do NOT use emojis or tell them to click buttons.`;

        return {
          toolName: name,
          summaryForAI,
          cardHint: { type: "offramp", data: cardData },
          transactionParams: {
            type: "offramp",
            cryptoAmount: String(deposit.amount),
            cryptoToken: cardData.cryptoToken,
            asset,
            bankName: paystackBank.name,
            accountNumber: cleanAccount,
            holderName: verifiedHolderName,
            depositAddress: deposit.address,
            reference,
          },
          requiresConfirmation: true,
        };
      } catch (err: any) {
        console.error(
          `[ToolExecutor] [User: ${userId}] offramp_ngn ✗ Error:`,
          err.message,
        );
        return {
          toolName: name,
          summaryForAI: `Failed to initiate offramp: ${err.message}`,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }
    }

    // ── Claim Testnet Faucet (Friendbot)
    case "claim_faucet": {
      const providedAddress = String(toolArgs.walletAddress || "").trim();
      const targetAddress =
        providedAddress.startsWith("G") && providedAddress.length === 56
          ? providedAddress
          : userCtx.stellarAddress;

      if (!targetAddress || !targetAddress.startsWith("G")) {
        return {
          toolName: name,
          summaryForAI:
            "Cannot claim faucet: No valid Stellar public key (G...) found for your account.",
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      console.log(
        `[ToolExecutor] [User: ${userId}] claim_faucet requested for: ${targetAddress}`,
      );
      const res = await fundTestnetAccount(targetAddress);

      if (!res.success) {
        return {
          toolName: name,
          summaryForAI: `Faucet funding failed: ${res.message}. The testnet network may be busy.`,
          cardHint: { type: "none" },
          requiresConfirmation: false,
        };
      }

      // Fetch fresh testnet balance
      let newBalanceText = "10,000 XLM";
      try {
        const bal = await fetchStellarBalances(targetAddress);
        newBalanceText = `${bal.testnet.native} XLM`;
      } catch {
        // Fallback
      }

      return {
        toolName: name,
        summaryForAI:
          `Successfully funded your Stellar testnet wallet (${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}) with 10,000 testnet XLM via Friendbot. ` +
          `Your active testnet balance is now **${newBalanceText}**. Your wallet is active and ready for testnet transactions!`,
        cardHint: { type: "none" },
        requiresConfirmation: false,
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
