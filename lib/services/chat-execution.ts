/**
 * lib/services/chat-execution.ts
 *
 * Streamlined execution service for on-chain and fiat transactions initiated in AI Chat:
 * - Swaps (Soroswap Stellar)
 * - Cross-Chain Bridge (Circle CCTP v2)
 * - Savings (Defindex / Soroban)
 * - Transfers (Stellar, EVM, Solana via transfer-service)
 * - Offramp (Switch / Centiiv crypto-to-fiat via executeOfframpTransfer)
 */

import { type IWallet } from "@/models/Wallet";
import { decryptMnemonic } from "@/lib/crypto";
import { executeStellarSwap } from "@/lib/execution/stellar-swap";
import { executeBridge } from "@/lib/execution/bridge-execute";
import {
  createSavingsPlanExecution,
  depositSavingsExecution,
  withdrawSavingsExecution,
} from "@/lib/services/savings-execution";
import {
  resolveChainPrivateKey,
  sendEvm,
  sendSolana,
  sendStellar,
} from "@/lib/chains/transfer-service";
import { executeOfframpTransfer } from "@/lib/chains/offramp-transfer";
import { SwitchService } from "@/lib/switch";
import {
  createTransactionRecord,
  updateTransactionByReference,
} from "@/lib/functions/transactionFunctions";
import { updateWalletById } from "@/lib/functions/walletFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import {
  assertDailyTransactionLimit,
  isLimitError,
} from "@/lib/functions/transactionLimitFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

export interface ChatExecutionResult {
  ok: boolean;
  error?: string;
  status?: number;
  receiptCardData?: any;
  txHash?: string;
  explorerUrl?: string;
  assistantSummary?: string;
}

/**
 * Decrypts wallet mnemonic using PIN with error suppression
 */
function decryptWalletPhrase(wallet: IWallet, pin: string): string | null {
  if (!wallet?.encryptedMnemonic || !pin) return null;
  try {
    return decryptMnemonic(wallet.encryptedMnemonic, wallet.iv, wallet.salt, pin);
  } catch {
    return null;
  }
}

/**
 * Shared helper: Records on-chain transfer in DB, updates wallet, logs activity, and returns standard receipt card.
 */
async function recordTransferSuccess(params: {
  userId: string;
  walletId: string;
  sessionId: string;
  messageId?: string;
  chain: "stellar" | "solana" | "base" | "eth" | "ethereum" | "tron" | "fiat";
  network: "mainnet" | "testnet";
  fromAddress: string;
  toAddress: string;
  amount: string;
  token: string;
  amountInUsd?: number;
  txHash: string;
  explorerUrl: string;
  fee: string;
  networkLabel: string;
  req?: Request;
}): Promise<ChatExecutionResult> {
  const {
    userId,
    walletId,
    sessionId,
    messageId,
    chain,
    network,
    fromAddress,
    toAddress,
    amount,
    token,
    amountInUsd,
    txHash,
    explorerUrl,
    fee,
    networkLabel,
    req,
  } = params;

  createTransactionRecord({
    userId,
    walletId,
    sessionId,
    messageId,
    type: "TRANSFER",
    status: "CONFIRMED",
    chain,
    network,
    fromAddress,
    toAddress,
    amount,
    token,
    amountInUsd,
    txHash,
    explorerUrl,
  }).catch(() => {});

  updateWalletById(walletId, { lastUsedAt: new Date() }).catch(() => {});

  logUserActivity({
    userId,
    action: "TRANSFER_SENT",
    details: {
      recipient: toAddress,
      amount,
      token,
      chain,
      network,
      txHash,
    },
    req,
  }).catch(() => {});

  createNotification({
    userId,
    tab: "transactions",
    title: "Transfer Sent",
    body: `Sent ${amount} ${token} to ${toAddress.slice(0, 4)}...${toAddress.slice(-4)} (${networkLabel}).`,
    type: "TRANSFER_SENT",
  }).catch(() => null);

  const receiptCardData = {
    title: "Transfer",
    status: "Successful",
    balance: {
      caption: "SENT",
      value: amount,
      badge: token,
    },
    stats: [
      { lead: "Recipient ", value: `${toAddress.slice(0, 4)}...${toAddress.slice(-4)}` },
      { lead: "Network ", value: networkLabel },
      { lead: "Network Fee ", value: fee },
    ],
    txHash,
    explorerUrl,
  };

  return {
    ok: true,
    receiptCardData,
    txHash,
    explorerUrl,
    assistantSummary: "✓ Transfer successful",
  };
}

/**
 * Executes a DEX token swap proposed in chat
 */
export async function executeChatSwap(params: {
  wallet: IWallet;
  pin: string;
  effectiveCardData: any;
  txParams: any;
  userId: string;
  sessionId: string;
  messageId?: string;
  req?: Request;
}): Promise<ChatExecutionResult> {
  const { wallet, pin, effectiveCardData, txParams, userId, sessionId, messageId, req } = params;

  const payVal = effectiveCardData?.pay?.value || txParams?.fromAmount || "0";
  const payBadge = effectiveCardData?.pay?.badge || txParams?.fromToken || "XLM";
  const receiveVal = effectiveCardData?.receive?.value || txParams?.toAmount || "0";
  const receiveBadge = effectiveCardData?.receive?.badge || txParams?.toToken || "USDC";
  const protocolName = txParams?.protocol || effectiveCardData?._rawQuote?.protocol || "Soroswap";
  const network = txParams?.network || "mainnet";
  const rawQuote = effectiveCardData?._rawQuote;

  if (!wallet.encryptedMnemonic || !pin) {
    return { ok: false, error: "Wallet mnemonic or PIN missing", status: 400 };
  }

  const swapResult = await executeStellarSwap({
    wallet,
    pin,
    rawQuote: rawQuote || {},
    network,
    fromToken: payBadge,
    toToken: receiveBadge,
    fromAmount: payVal,
    toAmount: receiveVal,
    userId,
    sessionId,
    messageId,
  });

  if (!swapResult.ok) {
    return { ok: false, error: swapResult.error, status: swapResult.status };
  }

  const { txHash, explorerUrl } = swapResult;

  logUserActivity({
    userId,
    action: "SWAP_EXECUTED",
    details: {
      fromToken: payBadge,
      toToken: receiveBadge,
      fromAmount: payVal,
      toAmount: receiveVal,
      protocol: protocolName,
      txHash,
    },
    req,
  }).catch(() => {});

  const receiptCardData = {
    title: "Swap",
    status: "Successful",
    balance: {
      caption: "RECEIVED",
      value: receiveVal,
      badge: receiveBadge,
    },
    stats: [
      { lead: "Paid ", value: `- ${payVal} ${payBadge}` },
      { lead: "Received ", value: `+ ${receiveVal} ${receiveBadge}` },
      { lead: "Network Fee ", value: "0.00001 XLM" },
    ],
    txHash,
    explorerUrl,
  };

  return {
    ok: true,
    receiptCardData,
    txHash,
    explorerUrl,
    assistantSummary: "✓ Swap confirmed",
  };
}

/**
 * Executes a cross-chain bridge transfer proposed in chat
 */
export async function executeChatBridge(params: {
  wallet: IWallet;
  pin: string;
  effectiveCardData: any;
  txParams: any;
  userId: string;
  req?: Request;
}): Promise<ChatExecutionResult> {
  const { wallet, pin, effectiveCardData, txParams, userId, req } = params;

  const fromAmount = effectiveCardData?.pay?.value || txParams?.fromAmount || "0";
  const fromToken = effectiveCardData?.pay?.badge || txParams?.fromToken || "USDC";
  const rawFromChain = String(txParams?.fromChain || effectiveCardData?.pay?.chain || "stellar").toLowerCase();

  const toAmount = effectiveCardData?.receive?.value || txParams?.toAmount || fromAmount;
  const toToken = effectiveCardData?.receive?.badge || txParams?.toToken || "USDC";
  const rawToChain = String(txParams?.toChain || effectiveCardData?.receive?.chain || "base").toLowerCase();

  const normalizeChain = (c: string): "stellar" | "base" | "ethereum" | "solana" => {
    if (c.includes("sol")) return "solana";
    if (c.includes("eth")) return "ethereum";
    if (c.includes("base")) return "base";
    return "stellar";
  };

  const fromChain = normalizeChain(rawFromChain);
  const toChain = normalizeChain(rawToChain);

  const fee =
    txParams?.fee ||
    effectiveCardData?.stats?.find((s: any) => s.lead?.toLowerCase().includes("fee"))?.value ||
    (fromChain === "stellar" ? "Sponsored" : "0.00");

  const transferType = (txParams?.transferType as "standard" | "fast") || "fast";

  const defaultRecipient =
    toChain === "stellar"
      ? wallet.addresses?.xlm || wallet.address
      : toChain === "solana"
        ? wallet.addresses?.sol || ""
        : wallet.addresses?.base || wallet.addresses?.eth || wallet.address;

  const recipientAddress = txParams?.recipientAddress || defaultRecipient;

  if (!recipientAddress) {
    return { ok: false, error: "Recipient address is required", status: 400 };
  }

  const bridgeResult = await executeBridge({
    wallet,
    pin,
    fromChain,
    toChain,
    amount: fromAmount,
    toAmount,
    recipientAddress,
    transferType,
    fee,
    userId,
  });

  if (!bridgeResult.ok) {
    return { ok: false, error: bridgeResult.error, status: bridgeResult.status || 400 };
  }

  const { txHash, explorerUrl } = bridgeResult;

  updateWalletById(wallet._id, { lastUsedAt: new Date() }).catch(() => {});

  logUserActivity({
    userId,
    action: "BRIDGE_EXECUTED",
    details: {
      fromChain: bridgeResult.fromChain,
      toChain: bridgeResult.toChain,
      amount: fromAmount,
      toAmount,
      txHash,
      recipientAddress,
    },
    req,
  }).catch(() => {});

  createNotification({
    userId,
    tab: "transactions",
    title: "Bridge Initiated",
    body: `Bridging ${fromAmount} USDC from ${bridgeResult.fromChain} to ${bridgeResult.toChain}.`,
    type: "BRIDGE_INITIATED",
  }).catch(() => null);

  const receiptCardData = {
    title: "Bridge Initiated",
    status: "Initiated",
    balance: {
      caption: "BRIDGED",
      value: toAmount,
      badge: toToken,
    },
    stats: [
      { lead: "Sent ", value: `- ${fromAmount} ${fromToken} (${bridgeResult.fromChain})` },
      { lead: "Received ", value: `+ ${toAmount} ${toToken} (${bridgeResult.toChain})` },
      { lead: "Fee ", value: fee === "0.00" ? "0.00 USDC" : fee },
      {
        lead: "Recipient ",
        value: recipientAddress
          ? `${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-6)}`
          : "Wallet",
      },
    ],
    txHash: txHash || undefined,
    explorerUrl: explorerUrl || undefined,
  };

  return {
    ok: true,
    receiptCardData,
    txHash,
    explorerUrl,
    assistantSummary: "✓ Bridge transfer initiated",
  };
}

/**
 * Executes a savings plan creation, deposit, or withdrawal proposed in chat
 */
export async function executeChatSavings(params: {
  type: "savings_create" | "savings_deposit" | "savings_withdraw";
  wallet: IWallet;
  pin: string;
  txParams: any;
  userId: string;
}): Promise<ChatExecutionResult> {
  const { type, wallet, pin, txParams, userId } = params;

  if (type === "savings_create") {
    const { name: goalName, category, targetAmount, durationDays, depositAmount } = txParams;
    const res = await createSavingsPlanExecution({
      wallet,
      pin,
      userId,
      name: goalName || "Savings Goal",
      category,
      targetAmount: targetAmount ? Number(targetAmount) : undefined,
      durationDays: durationDays ? Number(durationDays) : undefined,
      depositAmount: depositAmount ? Number(depositAmount) : undefined,
    });
    if (!res.ok) return { ok: false, error: res.error, status: 400 };

    return {
      ok: true,
      receiptCardData: {
        title: "Savings Goal Created",
        status: "Successful",
        balance: {
          caption: "TARGET",
          value: targetAmount,
          badge: "USDC",
        },
        stats: [
          { lead: "Goal Name ", value: goalName },
          { lead: "Duration ", value: `${durationDays} Days` },
          { lead: "Initial Deposit ", value: depositAmount ? `${depositAmount} USDC` : "0 USDC" },
        ],
      },
      assistantSummary: `✓ Savings goal "${goalName}" created`,
    };
  }

  if (type === "savings_deposit") {
    const { planId, amount, name: goalName } = txParams;
    const res = await depositSavingsExecution({
      wallet,
      pin,
      userId,
      planId,
      amount,
    });
    if (!res.ok) return { ok: false, error: res.error, status: 400 };

    return {
      ok: true,
      receiptCardData: {
        title: "Savings Deposit",
        status: "Successful",
        balance: {
          caption: "DEPOSITED",
          value: amount,
          badge: "USDC",
        },
        stats: [
          { lead: "Plan ", value: goalName || "Savings Goal" },
          { lead: "Amount ", value: `${amount} USDC` },
        ],
      },
      assistantSummary: `✓ Deposited ${amount} USDC into "${goalName || "savings"}"`,
    };
  }

  // savings_withdraw
  const { planId, amount, name: goalName } = txParams;
  const res = await withdrawSavingsExecution({
    wallet,
    pin,
    userId,
    planId,
    amount,
  });
  if (!res.ok) return { ok: false, error: res.error, status: 400 };

  return {
    ok: true,
    receiptCardData: {
      title: "Savings Withdrawal",
      status: "Successful",
      balance: {
        caption: "WITHDRAWN",
        value: amount,
        badge: "USDC",
      },
      stats: [
        { lead: "Plan ", value: goalName || "Savings Goal" },
        { lead: "Amount ", value: `${amount} USDC` },
      ],
    },
    assistantSummary: `✓ Withdrawn ${amount} USDC from "${goalName || "savings"}"`,
  };
}

/**
 * Executes a direct crypto transfer proposed in chat (delegating to transfer-service)
 */
export async function executeChatTransfer(params: {
  wallet: IWallet;
  pin: string;
  txParams: any;
  userId: string;
  sessionId: string;
  messageId?: string;
  req?: Request;
}): Promise<ChatExecutionResult> {
  const { wallet, pin, txParams, userId, sessionId, messageId, req } = params;

  const amount = String(txParams?.amount || "0");
  const token = (txParams?.token || "XLM").toUpperCase();
  const recipient = String(txParams?.recipient || "").trim();
  const network = (txParams?.network || "mainnet") as "testnet" | "mainnet";
  const paramChain = (txParams?.chain || "").toLowerCase();

  // Enforce daily transaction limit
  let amountInUsd: number | undefined;
  try {
    const limitCheck = await assertDailyTransactionLimit({
      userId,
      amount,
      tokenOrCurrency: token,
    });
    amountInUsd = limitCheck.amountInUsd;
  } catch (limitErr: any) {
    if (isLimitError(limitErr)) {
      return { ok: false, error: limitErr.message, status: 400 };
    }
    throw limitErr;
  }

  const isEvmDest = recipient.startsWith("0x") && recipient.length === 42;
  const isStellarDest = recipient.startsWith("G") && recipient.length === 56;
  const isSolanaDest =
    !isEvmDest &&
    !isStellarDest &&
    recipient.length >= 32 &&
    recipient.length <= 44 &&
    !recipient.includes(" ");

  if (!isEvmDest && !isStellarDest && !isSolanaDest) {
    if (/^\d{10}$/.test(recipient)) {
      return {
        ok: false,
        error: `"${recipient}" appears to be a 10-digit bank account number. To send money to a bank account, please use cash out with your bank name.`,
        status: 400,
      };
    }
    return {
      ok: false,
      error: "Recipient must be a valid Stellar public key ('G...'), EVM address ('0x...'), or Solana address.",
      status: 400,
    };
  }

  const phrase = decryptWalletPhrase(wallet, pin);
  if (!phrase) {
    return { ok: false, error: "Incorrect PIN or wallet secret missing.", status: 401 };
  }

  try {
    if (isEvmDest) {
      const targetChain: "base" | "eth" =
        paramChain === "ethereum" || paramChain === "eth" || token === "USDT" ? "eth" : "base";
      const privateKey = await resolveChainPrivateKey(phrase, targetChain);
      const evmRes = await sendEvm({
        privateKey,
        destination: recipient,
        amount,
        asset: token,
        chain: targetChain,
      });

      return await recordTransferSuccess({
        userId,
        walletId: wallet._id,
        sessionId,
        messageId,
        chain: targetChain,
        network: "mainnet",
        fromAddress: evmRes.fromAddress,
        toAddress: recipient,
        amount,
        token,
        amountInUsd,
        txHash: evmRes.txHash,
        explorerUrl: evmRes.explorerUrl,
        fee: "0.00",
        networkLabel: targetChain === "eth" ? "Ethereum" : "Base",
        req,
      });
    }

    if (isSolanaDest) {
      const privateKey = await resolveChainPrivateKey(phrase, "solana");
      const solRes = await sendSolana({
        privateKey,
        destination: recipient,
        amount,
        asset: token,
      });

      return await recordTransferSuccess({
        userId,
        walletId: wallet._id,
        sessionId,
        messageId,
        chain: "solana",
        network,
        fromAddress: solRes.fromAddress,
        toAddress: recipient,
        amount,
        token,
        amountInUsd,
        txHash: solRes.txHash,
        explorerUrl: solRes.explorerUrl,
        fee: "0.000005 SOL",
        networkLabel: "Solana",
        req,
      });
    }

    // Default to Stellar
    const privateKey = await resolveChainPrivateKey(phrase, "stellar");
    const stellarRes = await sendStellar({
      privateKey,
      destination: recipient,
      amount,
      asset: token,
      network,
    });

    return await recordTransferSuccess({
      userId,
      walletId: wallet._id,
      sessionId,
      messageId,
      chain: "stellar",
      network,
      fromAddress: stellarRes.fromAddress,
      toAddress: recipient,
      amount,
      token,
      amountInUsd,
      txHash: stellarRes.txHash,
      explorerUrl: stellarRes.explorerUrl,
      fee: "0.00001 XLM",
      networkLabel: "Stellar",
      req,
    });
  } catch (err: any) {
    console.error(`[Chat] Transfer failed: ${formatOneLineError(err)}`);
    return {
      ok: false,
      error: err?.message || "Failed to process transfer",
      status: 500,
    };
  }
}

/**
 * Executes a crypto-to-fiat bank offramp proposed in chat (delegating to executeOfframpTransfer)
 */
export async function executeChatOfframp(params: {
  wallet: IWallet;
  pin: string;
  effectiveCardData: any;
  txParams: any;
  userId: string;
  req?: Request;
}): Promise<ChatExecutionResult> {
  const { wallet, pin, effectiveCardData, txParams, userId, req } = params;

  const cryptoAmount = effectiveCardData?.cryptoAmount || txParams?.cryptoAmount || "0";
  const cryptoToken = effectiveCardData?.cryptoToken || txParams?.cryptoToken || "USDC";
  const fiatAmount = effectiveCardData?.fiatAmount || txParams?.fiatAmount || "0";
  const bankName = effectiveCardData?.bankName || txParams?.bankName || "";
  const accountName = effectiveCardData?.accountName || txParams?.holderName || txParams?.accountName || "";
  const accountNumber = effectiveCardData?.accountNumber || txParams?.accountNumber || "";
  const depositAddress = effectiveCardData?.depositAddress || txParams?.depositAddress || "";
  const reference = effectiveCardData?.reference || txParams?.reference || "";
  const rawAsset = (effectiveCardData?.asset || txParams?.asset || "").trim();

  if (!depositAddress) {
    return { ok: false, error: "Deposit address missing. Please initiate a new offramp.", status: 400 };
  }

  // Enforce daily transaction limit
  const outboundAmount = Number(cryptoAmount) || Number(fiatAmount) || 0;
  const outboundCurrency = Number(cryptoAmount) > 0 ? cryptoToken : "NGN";
  let offrampAmountInUsd: number | undefined;
  try {
    const limitRes = await assertDailyTransactionLimit({
      userId,
      amount: outboundAmount,
      tokenOrCurrency: outboundCurrency,
    });
    offrampAmountInUsd = limitRes.amountInUsd;
  } catch (limitErr: any) {
    if (isLimitError(limitErr)) {
      return { ok: false, error: limitErr.message, status: 400 };
    }
    throw limitErr;
  }

  const phrase = decryptWalletPhrase(wallet, pin);
  if (!phrase) {
    return { ok: false, error: "Incorrect PIN or wallet secret missing.", status: 401 };
  }

  // Directly delegate to executeOfframpTransfer (handles EVM, Solana, Stellar, Tron)
  const transferResult = await executeOfframpTransfer({
    mnemonic: phrase,
    asset: rawAsset,
    depositAddress,
    amount: cryptoAmount,
  });

  if (!transferResult.success || !transferResult.txHash) {
    return {
      ok: false,
      error: transferResult.error || "On-chain crypto transfer failed.",
      status: 400,
    };
  }

  const { txHash, explorerUrl } = transferResult;
  const isStellar =
    rawAsset.toLowerCase().includes("stellar") ||
    (depositAddress.startsWith("G") && depositAddress.length === 56);

  if (!isStellar && reference) {
    SwitchService.confirmPayment(reference, txHash).catch((switchErr) => {
      console.warn(`[Chat] Switch confirmPayment notice: ${formatOneLineError(switchErr)}`);
    });
  }

  if (reference) {
    updateTransactionByReference(reference, {
      status: "PENDING",
      amountInUsd: offrampAmountInUsd,
      txHash,
      explorerUrl,
    }).catch(() => {});
  }

  updateWalletById(wallet._id, { lastUsedAt: new Date() }).catch(() => {});

  logUserActivity({
    userId,
    action: "OFFRAMP_INITIATED",
    details: {
      reference,
      cryptoAmount,
      cryptoToken,
      fiatAmount,
      bankName,
      accountNumber,
      txHash,
    },
    req,
  }).catch(() => {});

  const receiptCardData = {
    title: "Withdrawal Processing",
    status: "Processing",
    balance: {
      caption: "PROCESSING",
      value: Number(fiatAmount).toLocaleString(),
      badge: "NGN",
    },
    stats: [
      { lead: "Bank ", value: bankName },
      { lead: "Account Name ", value: accountName },
      {
        lead: "Account No. ",
        value:
          accountNumber.length === 10
            ? `${accountNumber.slice(0, 3)}****${accountNumber.slice(-3)}`
            : accountNumber,
      },
      { lead: "Asset Withdrawn ", value: cryptoAmount, badge: cryptoToken },
      {
        lead: "Time ",
        value: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Africa/Lagos",
        }),
        at: new Date().toISOString(),
      },
    ],
  };

  return {
    ok: true,
    receiptCardData,
    txHash,
    explorerUrl,
    assistantSummary: `✓ Withdrawal processing for ${bankName || "bank"}`,
  };
}
