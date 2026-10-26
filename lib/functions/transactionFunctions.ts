import { connectDB } from "@/lib/db";
import { Transaction, type ITransaction } from "@/models/Transaction";
import { SwitchService } from "@/lib/switch";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import type { TransactionDetailRow, TransactionKind } from "@/lib/wallet";
import { detectCarrierFromPhone } from "@/lib/bills";
import { getExplorerTxUrl, getSolanaRpcUrl } from "@/lib/blockchain";
import { getHorizonServer } from "@/lib/chains/stellar/client";
import { Connection } from "@solana/web3.js";
import { convertToUsd } from "@/lib/functions/transactionLimitFunctions";
import { dispatchTransactionEmail } from "@/lib/functions/transactionEmailFunctions";

// Types & Provider Interfaces 

export interface ProviderSyncResult {
  status: "CONFIRMED" | "FAILED" | "PENDING";
  txHash?: string;
  explorerUrl?: string;
  reason?: string;
  rawStatus: string;
}

interface RampProviderSyncHandler {
  checkStatus(reference: string, tx: any): Promise<ProviderSyncResult>;
}

export interface ResolveTransactionsResult {
  totalChecked: number;
  confirmed: number;
  failed: number;
  stillPending: number;
  details: Array<{
    id: string;
    reference: string;
    type: string;
    amount: string;
    token: string;
    previousStatus: string;
    newStatus: string;
    providerStatus: string;
    reason?: string;
  }>;
}

//  Helpers

function formatDecimal(val: string | number, maxDecimals = 4): string {
  if (val === undefined || val === null || val === "") return "";
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return String(val);

  return num.toLocaleString(undefined, {
    maximumFractionDigits: maxDecimals,
  });
}

function exchangeRate(
  fromAmount?: string | number,
  toAmount?: string | number,
  fromToken?: string,
  toToken?: string,
): string {
  const a = parseFloat(String(fromAmount || ""));
  const b = parseFloat(String(toAmount || ""));
  if (!a || !b) return "";
  const rate = formatDecimal(b / a, 4);
  if (fromToken && toToken) {
    return `1 ${fromToken} = ${rate} ${toToken}`;
  }
  return rate;
}

function timeTaken(tx: any): string {
  if (!tx.executedAt || !tx.createdAt) return "";
  const ms = new Date(tx.executedAt).getTime() - new Date(tx.createdAt).getTime();
  if (!isFinite(ms) || ms <= 0) return "";
  return ms < 60000 ? `${Math.round(ms / 1000)} secs` : `${Math.round(ms / 60000)} mins`;
}

function shortenKey(value?: string): string {
  if (!value || value.length <= 18) return value || "";
  return `${value.slice(0, 8)}…${value.slice(value.length - 6)}`;
}

//  Provider Handlers

const switchSyncHandler: RampProviderSyncHandler = {
  async checkStatus(reference: string): Promise<ProviderSyncResult> {
    const result = await SwitchService.getTransactionStatus(reference);
    if (!result.success || !result.data) {
      return {
        status: "PENDING",
        rawStatus: "UNKNOWN",
        reason: result?.message || "Failed to reach Switch",
      };
    }

    const rawStatus = (result.data.status || "").toUpperCase();
    const isCompleted = ["COMPLETED", "SUCCESS", "SUCCESSFUL", "DELIVERED", "SETTLED"].includes(rawStatus);
    const isFailed = ["FAILED", "EXPIRED", "CANCELLED", "REJECTED"].includes(rawStatus);

    if (isCompleted) {
      return {
        status: "CONFIRMED",
        txHash: result.data.meta?.hash || reference,
        explorerUrl: result.data.meta?.explorer_url || undefined,
        rawStatus,
      };
    }
    if (isFailed) {
      return {
        status: "FAILED",
        rawStatus,
        reason: result?.message || `Provider status: ${rawStatus}`,
      };
    }

    return {
      status: "PENDING",
      rawStatus: rawStatus || "AWAITING_DEPOSIT",
    };
  },
};

const centiivSyncHandler: RampProviderSyncHandler = {
  async checkStatus(reference: string, tx: any): Promise<ProviderSyncResult> {
    const { getCentiivRequestStatus } = await import("@/lib/functions/centiivFunctions");
    const result = await getCentiivRequestStatus(reference);

    if (!result?.status) {
      return { status: "PENDING", rawStatus: "UNKNOWN" };
    }

    const rawStatus = (result.status || "").toUpperCase();
    const isCompleted = rawStatus === "FULFILLED";
    const isFailed = ["FAILED", "EXPIRED", "REFUNDED"].includes(rawStatus);

    if (isCompleted) {
      const txHash = result.txHash || reference;

      // Handle custom onramp settlement if applicable
      if (
        tx.rampDetails?.fulfillmentAction === "CUSTOM_ONRAMP" &&
        tx.rampDetails?.settlementStatus !== "COMPLETED" &&
        tx.toAddress
      ) {
        const { settleOnrampTransferCustom } = await import(
          "@/lib/chains/onramp-transfer-custom"
        );
        const settleRes = await settleOnrampTransferCustom({
          transactionId: tx._id.toString(),
          recipientAddress: tx.toAddress,
          targetToken: tx.token || "XLM",
          cryptoAmount: tx.amount,
          centiivTxHash: txHash,
          expectedUsdcAmount: tx.rampDetails?.expectedUsdc,
          userId: tx.userId,
        });

        if (settleRes.success) {
          return {
            status: "CONFIRMED",
            txHash: settleRes.txHash || txHash,
            rawStatus,
          };
        }

        return {
          status: "PENDING",
          rawStatus: "SETTLING",
          reason: settleRes.error || "Custom onramp settlement in progress",
        };
      }

      return {
        status: "CONFIRMED",
        txHash,
        rawStatus,
      };
    }

    if (isFailed) {
      return {
        status: "FAILED",
        rawStatus,
        reason: `Centiiv status: ${rawStatus}`, // TODO: reset the reasons in the db. normalise them before showing them in the UI
      };
    }

    return {
      status: "PENDING",
      rawStatus: rawStatus || "PROCESSING",
    };
  },
};

const PROVIDER_HANDLERS: Record<string, RampProviderSyncHandler> = {
  switch: switchSyncHandler,
  centiiv: centiivSyncHandler,
};

function getProviderHandler(provider?: string): RampProviderSyncHandler {
  if (provider && PROVIDER_HANDLERS[provider.toLowerCase()]) {
    return PROVIDER_HANDLERS[provider.toLowerCase()];
  }
  return switchSyncHandler;
}

//  CRUD Operations 

/**
 * Creates a new transaction record in MongoDB.
 */
export async function createTransactionRecord(
  data: Partial<ITransaction>,
): Promise<ITransaction> {
  await connectDB();
  if (
    (data.amountInUsd === undefined || data.amountInUsd === null) &&
    data.amount &&
    data.token
  ) {
    try {
      data.amountInUsd = await convertToUsd(data.amount, data.token);
    } catch {
      // Fallback gracefully without breaking
    }
  }
  return Transaction.create(data);
}

async function _applySyncResult(
  tx: any,
  newStatus: "CONFIRMED" | "FAILED",
  txHash?: string,
  explorerUrl?: string,
  errorMessage?: string,
) {
  const updateData: Record<string, any> = { status: newStatus, updatedAt: new Date() };
  if (txHash) updateData.txHash = txHash;
  if (explorerUrl) updateData.explorerUrl = explorerUrl;
  if (errorMessage) updateData.errorMessage = errorMessage;

  // Atomically update only if status is changing to prevent concurrent duplicate notifications
  const updateRes = await Transaction.updateOne(
    { _id: tx._id, status: { $ne: newStatus } },
    { $set: updateData },
  );

  const statusChanged = updateRes.modifiedCount > 0;

  tx.status = newStatus;
  if (txHash) tx.txHash = txHash;
  if (explorerUrl) tx.explorerUrl = explorerUrl;
  if (errorMessage) tx.errorMessage = errorMessage;
  tx.updatedAt = updateData.updatedAt;

  if (newStatus === "CONFIRMED" && statusChanged) {
    if (tx.userId) invalidateBalanceCache(tx.userId);
    if (tx.toAddress) invalidateBalanceCache(tx.toAddress);
    if (tx.fromAddress) invalidateBalanceCache(tx.fromAddress);

    if (tx.userId) {
      if (tx.type === "ONRAMP" || tx.type === "DEPOSIT") {
        logUserActivity({
          userId: tx.userId,
          action: "ONRAMP_COMPLETED",
          details: { txId: tx._id, amount: tx.amount, token: tx.token, txHash },
        }).catch(() => { });
        createNotification({
          userId: tx.userId,
          tab: "transactions",
          type: "ONRAMP_COMPLETED",
          title: "Deposit Successful",
          body: `${tx.amount} ${tx.token} successfully deposited to your wallet`,
          metadata: { txId: tx._id, reference: tx.rampDetails?.reference || txHash, txHash, amount: tx.amount, token: tx.token },
          link: "/transactions",
        }).catch(() => { });
        dispatchTransactionEmail(tx._id, "DEPOSIT_CONFIRMED").catch(() => {});
      } else if (tx.type === "WITHDRAW") {
        const ref = tx.bankDetails?.reference || tx.txHash || tx._id;
        logUserActivity({
          userId: tx.userId,
          action: "WITHDRAWAL_COMPLETED",
          details: { txId: tx._id, reference: ref, amount: tx.amount, token: tx.token, txHash },
        }).catch(() => { });
        createNotification({
          userId: tx.userId,
          tab: "transactions",
          type: "WITHDRAWAL_COMPLETED",
          title: "Withdrawal Successful",
          body: `₦${Number(tx.amount).toLocaleString()} transfer to ${tx.bankDetails?.accountName || "beneficiary"} (${tx.bankDetails?.bankName || "Bank"}) has been completed successfully.`,
          metadata: {
            reference: ref,
            amount: tx.amount,
            bankName: tx.bankDetails?.bankName,
            accountNumber: tx.bankDetails?.accountNumber,
            txId: tx._id,
          },
          link: "/transactions",
        }).catch(() => { });
        dispatchTransactionEmail(tx._id, "WITHDRAWAL_CONFIRMED").catch(() => {});
      } else if (tx.type === "OFFRAMP") {
        logUserActivity({
          userId: tx.userId,
          action: "OFFRAMP_COMPLETED",
          details: { txId: tx._id, amount: tx.amount, token: tx.token, txHash },
        }).catch(() => { });
        createNotification({
          userId: tx.userId,
          tab: "transactions",
          type: "OFFRAMP_COMPLETED",
          title: "Withdrawal Successful",
          body: `${tx.amount} ${tx.token} sent to your bank account`,
          metadata: { txId: tx._id, reference: tx.rampDetails?.reference, txHash, amount: tx.amount, token: tx.token },
          link: "/transactions",
        }).catch(() => { });
        dispatchTransactionEmail(tx._id, "WITHDRAWAL_CONFIRMED").catch(() => {});
      } else if (tx.type === "SWAP") {
        logUserActivity({
          userId: tx.userId,
          action: "SWAP_EXECUTED",
          details: { txId: tx._id, amount: tx.amount, token: tx.token, txHash },
        }).catch(() => { });
        createNotification({
          userId: tx.userId,
          tab: "transactions",
          type: "SWAP_COMPLETED",
          title: "Swap Successful",
          body: `Swap of ${tx.amount} ${tx.token} successfully completed`,
          metadata: { txId: tx._id, txHash, amount: tx.amount, token: tx.token },
          link: "/transactions",
        }).catch(() => { });
      }
    }
  } else if (newStatus === "FAILED" && statusChanged && tx.userId) {
    if (tx.type === "WITHDRAW" || tx.type === "OFFRAMP") {
      dispatchTransactionEmail(tx._id, "WITHDRAWAL_FAILED").catch(() => {});
    }
  }

  return tx;
}

/**
 * Checks on-chain status of a Stellar transaction via Horizon.
 */
export async function checkStellarOnChainStatus(
  txHash: string,
  network: "mainnet" | "testnet" = "mainnet",
): Promise<{ found: boolean; successful: boolean; ledger?: number; createdAt?: string }> {
  try {
    const server = getHorizonServer(network);
    const horizonTx: any = await server.transactions().transaction(txHash).call();
    return {
      found: true,
      successful: horizonTx.successful === true,
      ledger: horizonTx.ledger_attr,
      createdAt: horizonTx.created_at,
    };
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.status === 404) {
      return { found: false, successful: false };
    }
    throw err;
  }
}

/**
 * Checks on-chain status of a Solana transaction via JSON-RPC polling.
 */
export async function checkSolanaOnChainStatus(
  txHash: string,
): Promise<{ found: boolean; successful: boolean; pending?: boolean }> {
  try {
    const connection = new Connection(getSolanaRpcUrl(), "confirmed");
    const { value } = await connection.getSignatureStatuses([txHash]);
    const status = value?.[0];
    if (!status) {
      return { found: false, successful: false };
    }
    if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
      return {
        found: true,
        successful: !status.err,
        pending: false,
      };
    }
    return { found: true, pending: true, successful: false };
  } catch (err: any) {
    console.warn(`[OnChain Sync] Solana status check error for ${txHash}:`, err?.message || err);
    return { found: false, successful: false };
  }
}

/**
 * Syncs a single PENDING on-chain transaction (e.g. SWAP, BRIDGE, TRANSFER) against
 * the blockchain (Stellar or Solana).
 */
export async function syncPendingOnChainTransaction(tx: any): Promise<any> {
  if (!tx || tx.status !== "PENDING" || !tx.txHash) {
    return tx;
  }

  const isStellar =
    tx.chain === "stellar" ||
    (!tx.chain && (tx.network === "mainnet" || tx.network === "testnet"));
  const isSolana = tx.chain === "solana";

  try {
    if (isStellar) {
      const net = (tx.network as "mainnet" | "testnet") || "mainnet";
      let onChain = await checkStellarOnChainStatus(tx.txHash, net);
      if (!onChain.found) {
        const altNet = net === "mainnet" ? "testnet" : "mainnet";
        const altCheck = await checkStellarOnChainStatus(tx.txHash, altNet);
        if (altCheck.found) onChain = altCheck;
      }

      if (onChain.found) {
        if (onChain.successful) {
          const explorer = tx.explorerUrl || getExplorerTxUrl("stellar", tx.txHash, net === "testnet");
          return await _applySyncResult(tx, "CONFIRMED", tx.txHash, explorer);
        } else {
          return await _applySyncResult(
            tx,
            "FAILED",
            tx.txHash,
            tx.explorerUrl,
            "Transaction failed on Stellar network",
          );
        }
      }
    } else if (isSolana) {
      const onChain = await checkSolanaOnChainStatus(tx.txHash);
      if (onChain.found && !onChain.pending) {
        if (onChain.successful) {
          const explorer = tx.explorerUrl || getExplorerTxUrl("solana", tx.txHash, false);
          return await _applySyncResult(tx, "CONFIRMED", tx.txHash, explorer);
        } else {
          return await _applySyncResult(
            tx,
            "FAILED",
            tx.txHash,
            tx.explorerUrl,
            "Transaction failed on Solana network",
          );
        }
      }
    }
  } catch (err) {
    console.warn(`[Transaction Sync] Error syncing pending tx ${tx._id}:`, err);
  }

  return tx;
}

/**
 * Syncs a single PENDING ramp transaction against its provider (Switch or Centiiv),
 * updating the DB and invalidating balance cache if the status has changed.
 */
export async function syncPendingRampTransaction(tx: any): Promise<any> {
  const isCustomPendingSettlement =
    tx?.rampDetails?.fulfillmentAction === "CUSTOM_ONRAMP" &&
    tx?.rampDetails?.settlementStatus !== "COMPLETED";

  if (!tx || (!isCustomPendingSettlement && tx.status !== "PENDING") || !tx.rampDetails?.reference) {
    return tx;
  }

  const handler = getProviderHandler(tx.rampDetails?.provider);

  try {
    const syncRes = await handler.checkStatus(tx.rampDetails.reference, tx);

    if (syncRes.status === "CONFIRMED") {
      return await _applySyncResult(tx, "CONFIRMED", syncRes.txHash, syncRes.explorerUrl);
    }
    if (syncRes.status === "FAILED") {
      return await _applySyncResult(tx, "FAILED", undefined, undefined, syncRes.reason);
    }
  } catch (err) {
    console.warn(`[Transaction Sync] Notice syncing pending tx ${tx._id}:`, err);
  }

  return tx;
}

/**
 * Syncs a single PENDING Aella bank transfer against Aella's transfer status query.
 */
export async function syncPendingAellaTransaction(tx: any): Promise<any> {
  const reference = tx?.bankDetails?.reference || tx?.txHash || tx?._id;
  if (!tx || tx.status !== "PENDING" || !reference) {
    return tx;
  }

  try {
    const { queryAellaTransferStatus } = await import(
      "@/lib/functions/aellaFunctions"
    );
    const res = await queryAellaTransferStatus(reference);

    if (res.status === "SUCCESSFUL") {
      const sessionId = res.sessionId || reference;
      return await _applySyncResult(tx, "CONFIRMED", sessionId);
    }

    if (res.status === "FAILED") {
      const failureReason =
        res.failureReason || "Transfer declined by destination bank";

      console.log(
        `[Aella] Payout ${reference} marked FAILED (${failureReason}).`,
      );

      return await _applySyncResult(
        tx,
        "FAILED",
        undefined,
        undefined,
        failureReason,
      );
    }
  } catch (err: any) {
    console.warn(
      `[Aella Sync] Notice querying status for withdrawal ${tx._id}:`,
      err?.message || err,
    );
  }

  return tx;
}

/**
 * Dispatches sync for any PENDING transaction — whether ramp, bank transfer, or on-chain.
 */
export async function syncPendingTransaction(tx: any): Promise<any> {
  const isCustomPendingSettlement =
    tx?.rampDetails?.fulfillmentAction === "CUSTOM_ONRAMP" &&
    tx?.rampDetails?.settlementStatus !== "COMPLETED";

  if (!tx || (!isCustomPendingSettlement && tx.status !== "PENDING")) {
    return tx;
  }

  // 1. Bank withdrawal via Aella
  if (
    tx.type === "WITHDRAW" &&
    (tx.bankDetails?.reference || tx.chain === "fiat")
  ) {
    return syncPendingAellaTransaction(tx);
  }

  // 2. Ramp transactions (Onramp / Offramp via Switch or Centiiv)
  if (tx.rampDetails?.reference) {
    return syncPendingRampTransaction(tx);
  }

  // 3. On-chain crypto transactions
  if (tx.txHash) {
    return syncPendingOnChainTransaction(tx);
  }

  return tx;
}

/**
 * Lists transactions belonging to an authenticated user, ordered newest first.
 */
export async function listTransactionsByUserId(
  userId: string,
  limit = 20,
): Promise<ITransaction[]> {
  await connectDB();
  const raw = await Transaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<ITransaction[]>();

  return Promise.all(
    raw.map((tx) => {
      const isCustomPendingSettlement =
        tx.rampDetails?.fulfillmentAction === "CUSTOM_ONRAMP" &&
        tx.rampDetails?.settlementStatus !== "COMPLETED";

      return (tx.status === "PENDING" || isCustomPendingSettlement)
        ? syncPendingTransaction(tx)
        : Promise.resolve(tx);
    }),
  );
}

/**
 * Retrieves a single transaction strictly scoped to the owner.
 */
export async function getTransactionById(
  id: string,
  userId: string,
): Promise<ITransaction | null> {
  await connectDB();
  const cleanId = id.trim();
  const withoutPrefix = cleanId.replace(/^tx_/i, "");
  const withPrefix = `tx_${withoutPrefix}`;

  const candidates = Array.from(
    new Set([
      cleanId,
      cleanId.toLowerCase(),
      cleanId.toUpperCase(),
      withPrefix,
      withPrefix.toLowerCase(),
      withoutPrefix,
      withoutPrefix.toLowerCase(),
      withoutPrefix.toUpperCase(),
    ]),
  );

  const tx = await Transaction.findOne({
    _id: { $in: candidates },
    userId,
  }).lean();

  if (!tx) return null;
  return syncPendingTransaction(tx);
}

// Transaction Formatting Engine

const SUBJECT: Partial<Record<TransactionKind, string>> = {
  send: "Transfer",
  receive: "Deposit",
  card: "Card deposit",
  swap: "Swap",
  bridge: "Bridge",
  airtime: "Airtime",
  data: "Data",
  invest: "Savings",
};

const OUTCOME = {
  completed: "complete",
  pending: "pending",
  failed: "failed",
} as const;

interface TxTypeDescriptor {
  kind: TransactionKind;
  isIncoming: (tx: any) => boolean;
  getTitle: (tx: any) => string;
  getRows: (tx: any, status: string) => Array<[string, unknown, string?, string?]>;
}

const DEFAULT_DESCRIPTOR: TxTypeDescriptor = {
  kind: "send",
  isIncoming: (tx) =>
    tx.type === "ONRAMP" ||
    tx.type === "DEPOSIT" ||
    tx.type === "FAUCET" ||
    tx.type === "SAVINGS_WITHDRAW" ||
    (tx.type === "TRANSFER" &&
      (tx.fromAddress === "SWITCH_NGN_BANK" ||
        tx.fromAddress?.toLowerCase().includes("faucet"))),
  getTitle: (tx) => {
    if (tx.type === "TRANSFER") {
      const isIncoming =
        tx.fromAddress === "SWITCH_NGN_BANK" ||
        tx.fromAddress?.toLowerCase().includes("faucet");
      return `${isIncoming ? "Received" : "Sent"} ${tx.token}`;
    }
    return tx.token || "Transaction";
  },
  getRows: (tx) => {
    const isIncoming = DEFAULT_DESCRIPTOR.isIncoming(tx);
    const rows: [string, unknown, string?, string?][] = [
      ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`.trim()],
    ];
    if (isIncoming) {
      if (tx.fromAddress) rows.push(["Sender", shortenKey(tx.fromAddress), tx.fromAddress]);
      if (tx.toAddress) rows.push(["Recipient", shortenKey(tx.toAddress), tx.toAddress]);
    } else {
      if (tx.toAddress) rows.push(["Recipient", shortenKey(tx.toAddress), tx.toAddress]);
      if (tx.fromAddress) rows.push(["Sender", shortenKey(tx.fromAddress), tx.fromAddress]);
    }
    if (tx.memo) rows.push(["Memo", tx.memo]);
    return rows;
  },
};

const TX_DESCRIPTORS: Record<string, TxTypeDescriptor> = {
  SWAP: {
    kind: "swap",
    isIncoming: () => false,
    getTitle: (tx) => {
      const toAmount = tx.swapDetails?.toAmount
        ? `${formatDecimal(tx.swapDetails.toAmount, 4)} `
        : "";
      return `Swap to ${toAmount}${tx.swapDetails?.toToken || "Asset"}`;
    },
    getRows: (tx) => {
      const swap = tx.swapDetails;
      if (!swap) return [["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`.trim()]];
      const rows: [string, unknown, string?, string?][] = [
        ["Amount sent", `${formatDecimal(swap.fromAmount, 4)} ${swap.fromToken}`],
        ["Amount received", `${formatDecimal(swap.toAmount, 4)} ${swap.toToken}`],
        ["Rate", exchangeRate(swap.fromAmount, swap.toAmount, swap.fromToken, swap.toToken)],
      ];
      if (swap.slippage) rows.push(["Slippage", `${swap.slippage}%`]);
      return rows;
    },
  },

  BRIDGE: {
    kind: "bridge",
    isIncoming: () => false,
    getTitle: (tx) =>
      `Bridged to ${tx.bridgeDetails?.toChain
        ? tx.bridgeDetails.toChain.charAt(0).toUpperCase() + tx.bridgeDetails.toChain.slice(1)
        : "Asset"
      }`,
    getRows: (tx) => {
      const bridge = tx.bridgeDetails;
      const rows: [string, unknown, string?, string?][] = [];
      if (bridge?.fromAmount && bridge?.fromToken) {
        rows.push(["Amount sent", `${formatDecimal(bridge.fromAmount, 4)} ${bridge.fromToken}`]);
      } else {
        rows.push(["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`.trim()]);
      }
      if (bridge?.toAmount && bridge?.toToken) {
        rows.push(["Amount received", `${formatDecimal(bridge.toAmount, 4)} ${bridge.toToken}`]);
      }
      if (bridge?.fromChain) {
        rows.push(["Source Chain", bridge.fromChain.charAt(0).toUpperCase() + bridge.fromChain.slice(1)]);
      }
      if (bridge?.toChain) {
        rows.push(["Destination Chain", bridge.toChain.charAt(0).toUpperCase() + bridge.toChain.slice(1)]);
      }
      if (bridge?.fee) rows.push(["Bridge fee", bridge.fee]);
      if (bridge?.relayerFee) rows.push(["Relayer fee", bridge.relayerFee]);
      if (tx.toAddress) rows.push(["Recipient", shortenKey(tx.toAddress), tx.toAddress]);
      return rows;
    },
  },

  ONRAMP: {
    kind: "receive",
    isIncoming: () => true,
    getTitle: (tx) => `Deposit ${tx.token}`,
    getRows: (tx) => buildRampOrBankRows(tx),
  },

  DEPOSIT: {
    kind: "receive",
    isIncoming: () => true,
    getTitle: (tx) => {
      if (isNgnRefund(tx)) return "Transfer refund";
      const sender = tx.bankDetails?.senderName;
      if (sender) return `Transfer from ${sender}`;
      return `Deposit ${tx.token}`;
    },
    getRows: (tx) => {
      if (tx.chain && tx.chain !== "fiat") {
        const rows: [string, unknown, string?, string?][] = [
          ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`.trim()],
        ];
        if (tx.fromAddress && tx.fromAddress !== "unknown" && tx.fromAddress !== "NGN_BANK_TRANSFER") {
          rows.push(["Sender", shortenKey(tx.fromAddress), tx.fromAddress]);
        }
        if (tx.toAddress) {
          rows.push(["Recipient", shortenKey(tx.toAddress), tx.toAddress]);
        }
        if (tx.memo) rows.push(["Memo", tx.memo]);
        return rows;
      }
      return buildRampOrBankRows(tx);
    },
  },

  OFFRAMP: {
    kind: "send",
    isIncoming: () => false,
    getTitle: (tx) => {
      const recipient = tx.bankDetails?.accountName || tx.rampDetails?.bankDetails?.accountName;
      if (recipient) return `Transfer to ${recipient}`;
      return `Withdraw ${tx.token}`;
    },
    getRows: (tx) => buildRampOrBankRows(tx),
  },

  WITHDRAW: {
    kind: "send",
    isIncoming: () => false,
    getTitle: (tx) => {
      const recipient = tx.bankDetails?.accountName;
      if (recipient) return `Transfer to ${recipient}`;
      return `Withdraw ${tx.token}`;
    },
    getRows: (tx) => buildRampOrBankRows(tx),
  },

  FAUCET: {
    kind: "receive",
    isIncoming: () => true,
    getTitle: (tx) => `Claim ${tx.token}`,
    getRows: (tx) => [
      ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`.trim()],
      ["Recipient", shortenKey(tx.toAddress), tx.toAddress],
    ],
  },

  SAVINGS_DEPOSIT: {
    kind: "invest",
    isIncoming: () => false,
    getTitle: () => "Deposited to Savings",
    getRows: (tx) => {
      const rows: [string, unknown, string?, string?][] = [
        ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`.trim()],
      ];
      if (tx.savingsDetails?.planId) rows.push(["Plan", tx.savingsDetails.planId]);
      return rows;
    },
  },

  SAVINGS_WITHDRAW: {
    kind: "invest",
    isIncoming: () => true, // Funds return to wallet -> positive sign
    getTitle: () => "Withdrew from Savings",
    getRows: (tx) => {
      const rows: [string, unknown, string?, string?][] = [
        ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`.trim()],
      ];
      if (tx.savingsDetails?.planId) rows.push(["Plan", tx.savingsDetails.planId]);
      return rows;
    },
  },

  AIRTIME: {
    kind: "airtime",
    isIncoming: () => false,
    getTitle: (tx) => tx.memo || "Airtime Recharge",
    getRows: (tx) => {
      const carrier = resolveCarrier(tx, "AIRTIME");
      const rows: [string, unknown, string?, string?][] = [
        ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || "NGN"}`.trim()],
      ];
      if (carrier) rows.push(["Network", carrier.toUpperCase()]);
      if (tx.toAddress) rows.push(["Phone Number", tx.toAddress, tx.toAddress]);
      if (tx.memo) rows.push(["Description", tx.memo]);
      rows.push(["Payment Method", "Naira Wallet"]);
      if (tx.txHash) {
        const displayRef = cleanReference(tx.txHash);
        rows.push(["Reference", displayRef, tx.txHash]);
      }
      return rows;
    },
  },

  DATA: {
    kind: "data",
    isIncoming: () => false,
    getTitle: (tx) => tx.memo || "Data Subscription",
    getRows: (tx) => {
      const carrier = resolveCarrier(tx, "DATA");
      const rows: [string, unknown, string?, string?][] = [
        ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || "NGN"}`.trim()],
      ];
      if (carrier) rows.push(["Network", carrier.toUpperCase()]);
      if (tx.toAddress) rows.push(["Phone Number", tx.toAddress, tx.toAddress]);
      if (tx.memo) rows.push(["Description", tx.memo]);
      rows.push(["Payment Method", "Naira Wallet"]);
      if (tx.txHash) {
        const displayRef = cleanReference(tx.txHash);
        rows.push(["Reference", displayRef, tx.txHash]);
      }
      return rows;
    },
  },
};

/** The receipt of a failed naira transfer's money coming back: a `-refund` credit or a `-rollback`. */
function isNgnRefund(tx: { type?: string; txHash?: string | null }): boolean {
  return tx.type === "DEPOSIT" && /-(refund|rollback)$/.test(tx.txHash || "");
}

function cleanReference(ref?: string): string {
  if (!ref) return "";
  // Strip prefixes like "JUMPA-tx_", "JUMPA-", "Jumpa_", "tx_"
  const stripped = ref.replace(/^(?:JUMPA-tx_|JUMPA-|Jumpa_|tx_)/i, "");
  if (stripped.length > 20) {
    return `${stripped.slice(0, 8)}…${stripped.slice(stripped.length - 6)}`;
  }
  return stripped;
}

function buildRampOrBankRows(tx: any): Array<[string, unknown, string?, string?]> {
  const isWithdraw =
    tx.type === "WITHDRAW" ||
    tx.type === "OFFRAMP" ||
    tx.kind === "send";

  const numAmount = Number(tx.amount || 0);
  const feePaidNum = Number(tx.feePaid || 0);

  const rows: [string, unknown, string?, string?][] = [];

  const ramp = tx.rampDetails;
  const bank = tx.bankDetails || ramp?.bankDetails;

  const isOnChain = Boolean(tx.chain && tx.chain !== "fiat");

  if (tx.type === "ONRAMP") {
    if (ramp?.fiatAmount) {
      rows.push(["Fiat amount", `${ramp.fiatCurrency || "NGN"} ${formatDecimal(ramp.fiatAmount, 2)}`]);
    }
    rows.push(["Asset", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`.trim()]);
    if (feePaidNum > 0 && !isOnChain) {
      rows.push(["Deposit fee", `${formatDecimal(feePaidNum, 4)} ${tx.token || ""}`.trim()]);
    }
    if (ramp?.fiatAmount && numAmount > 0) {
      const unitRate = formatDecimal(Number(ramp.fiatAmount) / numAmount, 2);
      rows.push(["Rate", `1 ${tx.token || "Asset"} = ${ramp.fiatCurrency || "NGN"} ${unitRate}`]);
    }
  } else if (tx.type === "OFFRAMP") {
    rows.push(["Asset", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`.trim()]);
    if (ramp?.fiatAmount) {
      rows.push(["Fiat amount", `${ramp.fiatCurrency || "NGN"} ${formatDecimal(ramp.fiatAmount, 2)}`]);
    }
    if (feePaidNum > 0 && !isOnChain) {
      rows.push(["Withdrawal fee", `${formatDecimal(feePaidNum, 4)} ${tx.token || ""}`.trim()]);
    }
    if (ramp?.fiatAmount && numAmount > 0) {
      const unitRate = formatDecimal(Number(ramp.fiatAmount) / numAmount, 2);
      rows.push(["Rate", `1 ${tx.token || "Asset"} = ${ramp.fiatCurrency || "NGN"} ${unitRate}`]);
    }
  } else {
    rows.push(["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`.trim()]);
    if (isWithdraw && feePaidNum > 0) {
      if (!isOnChain) {
        rows.push(["Withdrawal fee", `${formatDecimal(feePaidNum, 4)} ${tx.token || ""}`.trim()]);
        const totalDebit = numAmount + feePaidNum;
        rows.push(["Total debited", `${formatDecimal(totalDebit, 4)} ${tx.token || ""}`.trim()]);
      }
    } else if (!isWithdraw && feePaidNum > 0 && !isOnChain) {
      rows.push(["Deposit fee", `${formatDecimal(feePaidNum, 4)} ${tx.token || ""}`.trim()]);
    }
  }

  if (bank) {
    if (isWithdraw) {
      // Sender's view: show recipient info
      if (bank.accountName) rows.push(["Recipient", bank.accountName]);
      if (bank.bankName) rows.push(["Recipient Bank", bank.bankName]);
      if (bank.accountNumber) rows.push(["Recipient Account", bank.accountNumber, bank.accountNumber]);
    } else {
      // Receiver's view: show who sent the money
      if (bank.senderName) {
        rows.push(["Sender", bank.senderName]);
      } else if (tx.fromAddress && tx.fromAddress !== "NGN_BANK_TRANSFER") {
        rows.push(["Sender", tx.fromAddress]);
      }
      if (bank.senderBank) rows.push(["Sender Bank", bank.senderBank]);
      if (bank.senderAccountNumber) rows.push(["Sender Account", bank.senderAccountNumber, bank.senderAccountNumber]);
    }
  } else if (tx.fromAddress && tx.fromAddress !== "NGN_BANK_TRANSFER" && tx.fromAddress !== "unknown") {
    rows.push(["Sender", shortenKey(tx.fromAddress), tx.fromAddress]);
  }

  // Session ID from bank verification (vital for user bank inquiries, no provider or channel)
  if (tx.bankVerification?.sessionId) {
    rows.push(["Session ID", tx.bankVerification.sessionId, tx.bankVerification.sessionId]);
  }

  const ref = bank?.reference || ramp?.reference || (tx.chain === "fiat" ? tx.txHash : undefined);
  if (ref) {
    const displayRef = cleanReference(ref);
    rows.push(["Reference", displayRef, ref]);
  }

  if (tx.refundedAt) {
    rows.push(["Refund status", "Refunded to your Naira balance"]);
  }

  if (tx.memo) rows.push(["Description", tx.memo]);

  return rows;
}

function resolveCarrier(tx: any, typeUpper: string): string | undefined {
  if (tx.carrier) return tx.carrier;
  if (typeUpper !== "AIRTIME" && typeUpper !== "DATA") return undefined;

  const memoLower = (tx.memo || "").toLowerCase();
  if (memoLower.includes("mtn")) return "mtn";
  if (memoLower.includes("airtel")) return "airtel";
  if (memoLower.includes("glo")) return "glo";
  if (memoLower.includes("9mobile") || memoLower.includes("etisalat")) return "9mobile";
  if (tx.toAddress) {
    return detectCarrierFromPhone(tx.toAddress) || undefined;
  }
  return undefined;
}

function detailRows(tx: any, status: string, descriptor: TxTypeDescriptor): TransactionDetailRow[] {
  const rows = descriptor.getRows(tx, status);

  const isOnChain = Boolean(tx.chain && tx.chain !== "fiat");
  const isRealTxHash =
    Boolean(tx.txHash) &&
    !tx.txHash.startsWith("bll_") &&
    !tx.txHash.endsWith("-refund") &&
    !tx.txHash.endsWith("-rollback");

  if (isOnChain) {
    const chainLabel = tx.chain ? tx.chain.charAt(0).toUpperCase() + tx.chain.slice(1) : "";
    rows.push(
      ["Network", `${chainLabel} ${tx.network || ""}`.trim()],
    );
    if (tx.feePaid && Number(tx.feePaid) > 0) {
      rows.push(["Network fee", `${formatDecimal(tx.feePaid, 6)} ${tx.token || ""}`.trim()]);
    }
    if (isRealTxHash && status !== "failed") {
      const explorerUrl = tx.explorerUrl || getExplorerTxUrl(tx.chain, tx.txHash, tx.network === "testnet");
      rows.push(["Transaction hash", shortenKey(tx.txHash), tx.txHash, explorerUrl]);
    }
  }

  // Deduplicate fee: If withdrawal fee and network fee are the same, remove withdrawal fee
  const withdrawalFeeIdx = rows.findIndex(([label]) => label === "Withdrawal fee");
  const networkFeeIdx = rows.findIndex(([label]) => label === "Network fee");
  if (withdrawalFeeIdx !== -1 && networkFeeIdx !== -1) {
    rows.splice(withdrawalFeeIdx, 1);
  }

  const cleanId = String(tx._id || tx.id || "").replace(/^tx_/i, "").toLowerCase();
  if (cleanId) {
    rows.push(["Transaction ID", cleanId, cleanId]);
  }

  return rows
    .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== "")
    .map(([label, value, copy, link]) => ({
      label,
      value: `${value}`.trim(),
      ...(copy ? { copy: String(copy).trim() } : {}),
      ...(link ? { link: String(link).trim() } : {}),
    }));
}

function getBaseTransactionFields(tx: any) {
  const rawId = String(tx._id || tx.id || "");
  const displayId = rawId.replace(/^tx_/i, "").toUpperCase();

  const typeUpper = (tx.type || "").toUpperCase();
  const token = (tx.token || "").toUpperCase();

  const isCard = tx.kind === "card" || tx.rampDetails?.provider === "mercuryo";
  const descriptor =
    TX_DESCRIPTORS[typeUpper] ||
    (isCard
      ? {
        kind: "card" as TransactionKind,
        isIncoming: () => true,
        getTitle: (t: any) => t.title || "Card deposit",
        getRows: (t: any) => buildRampOrBankRows(t),
      }
      : undefined) ||
    (token === "AIRTIME" ? TX_DESCRIPTORS.AIRTIME : undefined) ||
    (token === "DATA" ? TX_DESCRIPTORS.DATA : undefined) ||
    DEFAULT_DESCRIPTOR;

  const kind = descriptor.kind;
  const isIncoming = descriptor.isIncoming(tx);
  const title = tx.title || descriptor.getTitle(tx);

  const createdAtMs = new Date(
    tx.createdAt || tx.executedAt || Date.now(),
  ).getTime();

  let rawAmount = String(tx.amount || "").trim();
  let sign = "";
  if (rawAmount.startsWith("+")) {
    sign = "+";
    rawAmount = rawAmount.slice(1).trim();
  } else if (rawAmount.startsWith("-")) {
    sign = "-";
    rawAmount = rawAmount.slice(1).trim();
  } else {
    sign = isIncoming ? "+" : "-";
  }

  let tokenPart = tx.token || "";
  if (tokenPart && rawAmount.endsWith(tokenPart)) {
    rawAmount = rawAmount.slice(0, -tokenPart.length).trim();
  }

  const formattedAmountNum = formatDecimal(rawAmount, 4);
  const amount = `${sign}${formattedAmountNum} ${tokenPart}`.trim();

  const rawStatus = (tx.status || "").toLowerCase();
  const status: "completed" | "pending" | "failed" =
    rawStatus === "failed" || rawStatus === "cancelled"
      ? "failed"
      : rawStatus === "pending"
        ? "pending"
        : "completed";

  const carrier = resolveCarrier(tx, typeUpper);

  return {
    id: rawId,
    displayId,
    kind,
    title,
    createdAt: createdAtMs,
    amount,
    status,
    chain: tx.chain,
    carrier,
    token: tx.swapDetails?.fromToken || tx.token,
    rawAmount,
    tokenPart,
    descriptor,
  };
}

/**
 * Returns a lean summary DTO designed specifically for list cards
 */
export function formatTransactionSummary(tx: any) {
  const base = getBaseTransactionFields(tx);
  return {
    id: base.id,
    displayId: base.displayId,
    kind: base.kind,
    title: base.title,
    createdAt: base.createdAt,
    amount: base.amount,
    status: base.status,
    chain: base.chain,
    carrier: base.carrier,
  };
}

/**
 * Returns a rich detail DTO for receipts and single transaction inspection.
 */
export function formatTransactionDetail(tx: any) {
  const base = getBaseTransactionFields(tx);

  const isOnChain = Boolean(tx.chain && tx.chain !== "fiat");
  const isRealTxHash =
    Boolean(tx.txHash) &&
    !tx.txHash.startsWith("bll_") &&
    !tx.txHash.endsWith("-refund") &&
    !tx.txHash.endsWith("-rollback");

  const explorerUrl =
    isOnChain && isRealTxHash
      ? tx.explorerUrl || getExplorerTxUrl(tx.chain, tx.txHash, tx.network === "testnet")
      : undefined;

  return {
    id: base.id,
    displayId: base.displayId,
    kind: base.kind,
    title: base.title,
    createdAt: base.createdAt,
    amount: base.amount,
    status: base.status,
    chain: base.chain,
    carrier: base.carrier,
    token: base.token,
    explorerUrl,
    headline: `${formatDecimal(tx.swapDetails?.fromAmount ?? base.rawAmount, 4)} ${tx.swapDetails?.fromToken || base.tokenPart
      }`.trim(),
    heading: `${isNgnRefund(tx) ? "Refund" : (SUBJECT[base.kind] ?? "Transaction")} ${OUTCOME[base.status]}`,
    rows: detailRows(tx, base.status, base.descriptor),
  };
}

/**
 * Legacy compatibility alias pointing to formatTransactionDetail
 */
export function formatDbTransaction(tx: any) {
  return formatTransactionDetail(tx);
}

const DURATION_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function parseDurationDays(duration?: string): number {
  if (!duration) return 0;
  if (DURATION_DAYS[duration]) return DURATION_DAYS[duration];
  if (duration.includes("7")) return 7;
  if (duration.includes("30") || duration.includes("1 Month")) return 30;
  if (duration.includes("90") || duration.includes("3 Months")) return 90;
  return 0;
}

const TYPE_FILTER_MAP: Record<string, any[]> = {
  UTILITY: [
    { type: "UTILITY" },
    { type: "AIRTIME" },
    { type: "DATA" },
    { type: "airtime" },
    { type: "data" },
    { "rampDetails.provider": "bills" },
    { token: { $in: ["AIRTIME", "DATA", "ELECTRICITY"] } },
  ],
  AIRTIME: [{ type: "AIRTIME" }, { type: "airtime" }, { token: "AIRTIME" }],
  DATA: [{ type: "DATA" }, { type: "data" }, { token: "DATA" }],
  DEPOSIT: [{ type: "DEPOSIT" }, { type: "ONRAMP" }],
  ONRAMP: [{ type: "DEPOSIT" }, { type: "ONRAMP" }],
  WITHDRAW: [{ type: "WITHDRAW" }, { type: "OFFRAMP" }],
  OFFRAMP: [{ type: "WITHDRAW" }, { type: "OFFRAMP" }],
  SAVINGS: [{ type: "SAVINGS_DEPOSIT" }, { type: "SAVINGS_WITHDRAW" }],
  SAVINGS_DEPOSIT: [{ type: "SAVINGS_DEPOSIT" }],
  SAVINGS_WITHDRAW: [{ type: "SAVINGS_WITHDRAW" }],
};

export async function queryUserTransactions(params: {
  userId: string;
  type?: string;
  status?: string;
  chain?: string;
  network?: string;
  page?: number;
  limit?: number;
  duration?: string;
  card?: string;
  token?: string;
  search?: string;
}): Promise<{ transactions: any[]; total: number }> {
  await connectDB();

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  // Declarative query builder — avoid fragile mutations of $or / $and
  const filterClauses: any[] = [{ userId: params.userId }];

  if (params.token) {
    const tokenUpper = params.token.toUpperCase();
    filterClauses.push({
      $or: [
        { token: tokenUpper },
        { "swapDetails.fromToken": tokenUpper },
        { "swapDetails.toToken": tokenUpper },
        { "rampDetails.asset": new RegExp(`:${params.token}$`, "i") },
        { "rampDetails.fiatCurrency": tokenUpper },
      ],
    });
  }

  if (params.type) {
    const t = params.type.toUpperCase();
    const typeClauses = TYPE_FILTER_MAP[t] || [{ type: t }];
    filterClauses.push({ $or: typeClauses });
  }

  if (params.status) {
    const s = params.status.toUpperCase();
    filterClauses.push({ status: s === "COMPLETED" ? "CONFIRMED" : s });
  }
  if (params.chain) filterClauses.push({ chain: params.chain.toLowerCase() });
  if (params.network) filterClauses.push({ network: params.network.toLowerCase() });

  const durationDays = parseDurationDays(params.duration);
  if (durationDays > 0) {
    const threshold = new Date(Date.now() - durationDays * 24 * 60 * 60 * 1000);
    filterClauses.push({ createdAt: { $gte: threshold } });
  }

  if (params.card) {
    const last4 = params.card.replace(/\D/g, "");
    if (last4) {
      filterClauses.push({
        $or: [
          { "rampDetails.provider": "card" },
          { "rampDetails.bankDetails.accountNumber": { $regex: last4 } },
          { toAddress: { $regex: last4 } },
          { fromAddress: { $regex: last4 } },
        ],
      });
    }
  }

  if (params.search) {
    const rawSearch = params.search.trim();
    const cleanSearch = rawSearch.replace(/^(?:JUMPA-tx_|JUMPA-|Jumpa_|tx_)/i, "").trim();
    const escapedRaw = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedClean = cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    filterClauses.push({
      $or: [
        { _id: new RegExp(escapedRaw, "i") },
        { _id: new RegExp(`tx_${escapedClean}`, "i") },
        { txHash: new RegExp(escapedRaw, "i") },
        { "rampDetails.reference": new RegExp(escapedRaw, "i") },
        { title: new RegExp(escapedRaw, "i") },
        { memo: new RegExp(escapedRaw, "i") },
      ],
    });
  }

  const query = filterClauses.length === 1 ? filterClauses[0] : { $and: filterClauses };

  const [rawTransactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(query),
  ]);

  const transactions = await Promise.all(
    rawTransactions.map((tx) =>
      tx.status === "PENDING"
        ? syncPendingTransaction(tx)
        : Promise.resolve(tx),
    ),
  );

  return { transactions, total };
}

// ── Status Updates & Lookups 

export async function updateTransactionStatus(params: {
  id: string;
  userId: string;
  status: ITransaction["status"];
  txHash?: string;
  errorMessage?: string;
}): Promise<ITransaction | null> {
  await connectDB();
  const update: Record<string, any> = {
    $set: {
      status: params.status,
      ...(params.txHash ? { txHash: params.txHash } : {}),
      ...(params.errorMessage ? { errorMessage: params.errorMessage } : {}),
    },
  };

  return Transaction.findOneAndUpdate(
    { _id: params.id, userId: params.userId },
    update,
    { returnDocument: "after" },
  );
}

export async function findTransactionByReference(
  reference: string,
): Promise<ITransaction | null> {
  await connectDB();
  return Transaction.findOne({
    $or: [{ "rampDetails.reference": reference }, { txHash: reference }],
  }).lean<ITransaction>();
}

export async function updateTransactionByReference(
  reference: string,
  data: Partial<ITransaction> | Record<string, any>,
): Promise<boolean> {
  await connectDB();
  const res = await Transaction.updateOne(
    {
      $or: [{ "rampDetails.reference": reference }, { txHash: reference }],
    },
    { $set: data },
  );
  return res.matchedCount > 0;
}

export async function findConfirmedTransactionsByReferences(
  userId: string,
  references: string[],
): Promise<ITransaction[]> {
  await connectDB();
  return Transaction.find({
    userId,
    status: "CONFIRMED",
    $or: [
      { "rampDetails.reference": { $in: references } },
      { txHash: { $in: references } },
    ],
  }).lean();
}

export async function updateTransactionRecord(
  id: string,
  data: Partial<ITransaction> | Record<string, any>,
): Promise<ITransaction | null> {
  await connectDB();
  return Transaction.findByIdAndUpdate(
    id,
    { $set: data },
    { returnDocument: "after" },
  ).lean<ITransaction>();
}

export async function findRecentUserTransactions(
  userId: string,
  cutoff: Date,
  types: ITransaction["type"][] = ["TRANSFER", "SWAP"],
): Promise<ITransaction[]> {
  await connectDB();
  return Transaction.find({
    userId,
    type: { $in: types },
    createdAt: { $gte: cutoff },
  }).lean();
}

/**
 * Iterates through all PENDING transactions that have a ramp reference (e.g. Switch/Centiiv onramp/offramp),
 * queries the provider API, and updates their status in the database.
 */
export async function resolveAllPendingTransactions(options?: {
  staleHours?: number;
}): Promise<ResolveTransactionsResult> {
  await connectDB();
  const staleHours = options?.staleHours ?? 24;
  const cutoffTime = new Date(Date.now() - staleHours * 60 * 60 * 1000);

  const pendingTxs = await Transaction.find({
    status: "PENDING",
    $or: [
      { "rampDetails.reference": { $exists: true, $ne: null } },
      { "bankDetails.reference": { $exists: true, $ne: null } },
      { txHash: { $exists: true, $ne: null } },
    ],
  }).lean();

  console.log(
    `[ResolveTx] Starting resolution run for ${pendingTxs.length} pending tx(s) — stale threshold: ${staleHours}h`,
  );

  const result: ResolveTransactionsResult = {
    totalChecked: pendingTxs.length,
    confirmed: 0,
    failed: 0,
    stillPending: 0,
    details: [],
  };

  for (const tx of pendingTxs) {
    const isStale = tx.createdAt && new Date(tx.createdAt) < cutoffTime;

    // 1. Bank withdrawals via Aella
    if (
      tx.type === "WITHDRAW" &&
      (tx.bankDetails?.reference || tx.chain === "fiat")
    ) {
      const reference = tx.bankDetails?.reference || tx.txHash || tx._id;
      try {
        const synced = await syncPendingAellaTransaction(tx);
        if (synced.status === "CONFIRMED") {
          result.confirmed++;
          result.details.push({
            id: tx._id,
            reference,
            type: tx.type,
            amount: tx.amount,
            token: tx.token,
            previousStatus: "PENDING",
            newStatus: "CONFIRMED",
            providerStatus: "SUCCESSFUL",
          });
        } else if (synced.status === "FAILED") {
          result.failed++;
          result.details.push({
            id: tx._id,
            reference,
            type: tx.type,
            amount: tx.amount,
            token: tx.token,
            previousStatus: "PENDING",
            newStatus: "FAILED",
            providerStatus: "FAILED",
            reason: synced.errorMessage,
          });
        } else {
          result.stillPending++;
          result.details.push({
            id: tx._id,
            reference,
            type: tx.type,
            amount: tx.amount,
            token: tx.token,
            previousStatus: "PENDING",
            newStatus: "PENDING",
            providerStatus: "PENDING",
            reason: "Bank settlement in progress",
          });
        }
      } catch (err: any) {
        console.error(
          `[ResolveTx] Error resolving bank tx ${reference}:`,
          err?.message || err,
        );
        result.stillPending++;
      }
      continue;
    }

    // 2. Ramp provider transactions (Switch or Centiiv)
    if (tx.rampDetails?.reference) {
      const reference = tx.rampDetails.reference;
      const handler = getProviderHandler(tx.rampDetails?.provider);

      try {
        const syncRes = await handler.checkStatus(reference, tx);

        if (syncRes.status === "CONFIRMED") {
          await _applySyncResult(tx, "CONFIRMED", syncRes.txHash, syncRes.explorerUrl);
          result.confirmed++;
          result.details.push({
            id: tx._id,
            reference,
            type: tx.type,
            amount: tx.amount,
            token: tx.token,
            previousStatus: "PENDING",
            newStatus: "CONFIRMED",
            providerStatus: syncRes.rawStatus,
          });
        } else if (syncRes.status === "FAILED" || isStale) {
          const reason =
            syncRes.status === "FAILED"
              ? syncRes.reason || `Provider failed: ${syncRes.rawStatus}`
              : `Order expired (> ${staleHours}h)`;

          await _applySyncResult(tx, "FAILED", undefined, undefined, reason);
          result.failed++;
          result.details.push({
            id: tx._id,
            reference,
            type: tx.type,
            amount: tx.amount,
            token: tx.token,
            previousStatus: "PENDING",
            newStatus: "FAILED",
            providerStatus: syncRes.rawStatus || "EXPIRED",
            reason,
          });
        } else {
          result.stillPending++;
          result.details.push({
            id: tx._id,
            reference,
            type: tx.type,
            amount: tx.amount,
            token: tx.token,
            previousStatus: "PENDING",
            newStatus: "PENDING",
            providerStatus: syncRes.rawStatus,
            reason: "Within active deposit window",
          });
        }
      } catch (err: any) {
        console.error(`[ResolveTx] ⚠️ Error resolving ref ${reference}:`, err?.message || err);
        result.stillPending++;
        result.details.push({
          id: tx._id,
          reference,
          type: tx.type,
          amount: tx.amount,
          token: tx.token,
          previousStatus: "PENDING",
          newStatus: "PENDING",
          providerStatus: "ERROR",
          reason: err?.message || "Error contacting provider",
        });
      }
      continue;
    }

    // 2. On-chain transactions (SWAP, BRIDGE, TRANSFER) with txHash
    if (tx.txHash) {
      const txHash = tx.txHash;
      const isStellar =
        tx.chain === "stellar" ||
        (!tx.chain && (tx.network === "mainnet" || tx.network === "testnet"));
      const isSolana = tx.chain === "solana";

      try {
        if (isStellar) {
          const net = (tx.network as "mainnet" | "testnet") || "mainnet";
          let onChain = await checkStellarOnChainStatus(txHash, net);
          if (!onChain.found) {
            const altNet = net === "mainnet" ? "testnet" : "mainnet";
            const altCheck = await checkStellarOnChainStatus(txHash, altNet);
            if (altCheck.found) onChain = altCheck;
          }

          if (onChain.found) {
            if (onChain.successful) {
              const explorer = tx.explorerUrl || getExplorerTxUrl("stellar", txHash, net === "testnet");
              await _applySyncResult(tx, "CONFIRMED", txHash, explorer);
              result.confirmed++;
              result.details.push({
                id: tx._id,
                reference: txHash,
                type: tx.type,
                amount: tx.amount,
                token: tx.token,
                previousStatus: "PENDING",
                newStatus: "CONFIRMED",
                providerStatus: "STELLAR_ONCHAIN_SUCCESS",
              });
            } else {
              const reason = "Transaction failed on Stellar network";
              await _applySyncResult(tx, "FAILED", txHash, tx.explorerUrl, reason);
              result.failed++;
              result.details.push({
                id: tx._id,
                reference: txHash,
                type: tx.type,
                amount: tx.amount,
                token: tx.token,
                previousStatus: "PENDING",
                newStatus: "FAILED",
                providerStatus: "STELLAR_ONCHAIN_FAILED",
                reason,
              });
            }
          } else if (isStale) {
            const reason = `On-chain tx dropped / not found in ledger (> ${staleHours}h)`;
            await _applySyncResult(tx, "FAILED", txHash, tx.explorerUrl, reason);
            result.failed++;
            result.details.push({
              id: tx._id,
              reference: txHash,
              type: tx.type,
              amount: tx.amount,
              token: tx.token,
              previousStatus: "PENDING",
              newStatus: "FAILED",
              providerStatus: "ONCHAIN_DROPPED",
              reason,
            });
          } else {
            result.stillPending++;
            result.details.push({
              id: tx._id,
              reference: txHash,
              type: tx.type,
              amount: tx.amount,
              token: tx.token,
              previousStatus: "PENDING",
              newStatus: "PENDING",
              providerStatus: "MEMPOOL_PENDING",
              reason: "Awaiting on-chain confirmation",
            });
          }
        } else if (isSolana) {
          const onChain = await checkSolanaOnChainStatus(txHash);
          if (onChain.found && !onChain.pending) {
            if (onChain.successful) {
              const explorer = tx.explorerUrl || getExplorerTxUrl("solana", txHash, false);
              await _applySyncResult(tx, "CONFIRMED", txHash, explorer);
              result.confirmed++;
              result.details.push({
                id: tx._id,
                reference: txHash,
                type: tx.type,
                amount: tx.amount,
                token: tx.token,
                previousStatus: "PENDING",
                newStatus: "CONFIRMED",
                providerStatus: "SOLANA_ONCHAIN_SUCCESS",
              });
            } else {
              const reason = "Transaction failed on Solana network";
              await _applySyncResult(tx, "FAILED", txHash, tx.explorerUrl, reason);
              result.failed++;
              result.details.push({
                id: tx._id,
                reference: txHash,
                type: tx.type,
                amount: tx.amount,
                token: tx.token,
                previousStatus: "PENDING",
                newStatus: "FAILED",
                providerStatus: "SOLANA_ONCHAIN_FAILED",
                reason,
              });
            }
          } else if (isStale) {
            const reason = `On-chain tx dropped / not found (> ${staleHours}h)`;
            await _applySyncResult(tx, "FAILED", txHash, tx.explorerUrl, reason);
            result.failed++;
            result.details.push({
              id: tx._id,
              reference: txHash,
              type: tx.type,
              amount: tx.amount,
              token: tx.token,
              previousStatus: "PENDING",
              newStatus: "FAILED",
              providerStatus: "ONCHAIN_DROPPED",
              reason,
            });
          } else {
            result.stillPending++;
            result.details.push({
              id: tx._id,
              reference: txHash,
              type: tx.type,
              amount: tx.amount,
              token: tx.token,
              previousStatus: "PENDING",
              newStatus: "PENDING",
              providerStatus: "SOLANA_PENDING",
              reason: "Awaiting confirmation",
            });
          }
        }
      } catch (err: any) {
        console.error(`[ResolveTx] ⚠️ Error resolving on-chain tx ${txHash}:`, err?.message || err);
        result.stillPending++;
        result.details.push({
          id: tx._id,
          reference: txHash,
          type: tx.type,
          amount: tx.amount,
          token: tx.token,
          previousStatus: "PENDING",
          newStatus: "PENDING",
          providerStatus: "ERROR",
          reason: err?.message || "Error contacting blockchain node",
        });
      }
    }
  }

  console.log(
    `[ResolveTx] Run complete. Checked: ${result.totalChecked} | Confirmed: ${result.confirmed} | Failed: ${result.failed} | Still Pending: ${result.stillPending}`,
  );

  return result;
}
