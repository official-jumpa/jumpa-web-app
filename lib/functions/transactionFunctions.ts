import { connectDB } from "@/lib/db";
import { Transaction, type ITransaction } from "@/models/Transaction";
import { SwitchService } from "@/lib/switch";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import type { TransactionDetailRow, TransactionKind } from "@/lib/wallet";
import { detectCarrierFromPhone } from "@/lib/bills";

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

function exchangeRate(from?: string, to?: string): string {
  const a = parseFloat(String(from || ""));
  const b = parseFloat(String(to || ""));
  if (!a || !b) return "";
  return formatDecimal(b / a, 4);
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
        reason: `Centiiv status: ${rawStatus}`,
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

  await Transaction.updateOne({ _id: tx._id }, { $set: updateData });

  tx.status = newStatus;
  if (txHash) tx.txHash = txHash;
  if (explorerUrl) tx.explorerUrl = explorerUrl;
  if (errorMessage) tx.errorMessage = errorMessage;
  tx.updatedAt = updateData.updatedAt;

  if (newStatus === "CONFIRMED") {
    if (tx.userId) invalidateBalanceCache(tx.userId);
    if (tx.toAddress) invalidateBalanceCache(tx.toAddress);
    if (tx.fromAddress) invalidateBalanceCache(tx.fromAddress);

    if (tx.userId) {
      const isDeposit = tx.type === "ONRAMP" || tx.type === "DEPOSIT";
      const isWithdraw = tx.type === "OFFRAMP" || tx.type === "WITHDRAW";

      if (isDeposit) {
        logUserActivity({
          userId: tx.userId,
          action: "ONRAMP_COMPLETED",
          details: { txId: tx._id, amount: tx.amount, token: tx.token, txHash },
        }).catch(() => {});
        createNotification({
          userId: tx.userId,
          tab: "transactions",
          type: "ONRAMP_COMPLETED",
          title: "Deposit Successful",
          body: `${tx.amount} ${tx.token} successfully deposited to your wallet`,
          metadata: { txId: tx._id, txHash, amount: tx.amount, token: tx.token },
          link: "/transactions",
        }).catch(() => {});
      } else if (isWithdraw) {
        logUserActivity({
          userId: tx.userId,
          action: "OFFRAMP_COMPLETED",
          details: { txId: tx._id, amount: tx.amount, token: tx.token, txHash },
        }).catch(() => {});
        createNotification({
          userId: tx.userId,
          tab: "transactions",
          type: "OFFRAMP_COMPLETED",
          title: "Withdrawal Successful",
          body: `${tx.amount} ${tx.token} sent to your bank account`,
          metadata: { txId: tx._id, txHash, amount: tx.amount, token: tx.token },
          link: "/transactions",
        }).catch(() => {});
      }
    }
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

      return (tx.status === "PENDING" || isCustomPendingSettlement) &&
        tx.rampDetails?.reference
        ? syncPendingRampTransaction(tx)
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
  const tx = await Transaction.findOne({ _id: id, userId }).lean();
  if (!tx) return null;
  return syncPendingRampTransaction(tx);
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
  getRows: (tx: any, status: string) => Array<[string, unknown, string?]>;
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
    const rows: [string, unknown, string?][] = [
      ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`],
    ];
    if (tx.toAddress) rows.push(["To", shortenKey(tx.toAddress)]);
    if (tx.fromAddress) rows.push(["From", shortenKey(tx.fromAddress)]);
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
      if (!swap) return [["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`]];
      return [
        ["Amount sent", `${formatDecimal(swap.fromAmount, 4)} ${swap.fromToken}`],
        ["Amount received", `${formatDecimal(swap.toAmount, 4)} ${swap.toToken}`],
        ["Exchange rate", exchangeRate(swap.fromAmount, swap.toAmount)],
        ["Slippage", swap.slippage ? `${swap.slippage}%` : ""],
      ];
    },
  },

  BRIDGE: {
    kind: "bridge",
    isIncoming: () => false,
    getTitle: (tx) => `Bridged to ${tx.bridgeDetails?.toChain || "Asset"}`,
    getRows: (tx) => {
      const bridge = tx.bridgeDetails;
      const rows: [string, unknown, string?][] = [
        ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`],
      ];
      if (bridge?.fromChain) rows.push(["Source Chain", bridge.fromChain]);
      if (bridge?.toChain) rows.push(["Destination Chain", bridge.toChain]);
      if (bridge?.fromToken && bridge?.toToken) {
        rows.push(["Asset Pair", `${bridge.fromToken} → ${bridge.toToken}`]);
      }
      if (bridge?.fee) rows.push(["Bridge Fee", bridge.fee]);
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
      const sender = tx.bankDetails?.senderName;
      if (sender) return `Transfer from ${sender}`;
      return `Deposit ${tx.token}`;
    },
    getRows: (tx) => buildRampOrBankRows(tx),
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
      ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`],
      ["To", shortenKey(tx.toAddress)],
    ],
  },

  SAVINGS_DEPOSIT: {
    kind: "invest",
    isIncoming: () => false,
    getTitle: () => "Deposited to Savings",
    getRows: (tx) => {
      const rows: [string, unknown, string?][] = [
        ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`],
      ];
      if (tx.savingsDetails?.planId) rows.push(["Plan ID", tx.savingsDetails.planId]);
      if (tx.savingsDetails?.vaultAddress) rows.push(["Vault", shortenKey(tx.savingsDetails.vaultAddress)]);
      return rows;
    },
  },

  SAVINGS_WITHDRAW: {
    kind: "invest",
    isIncoming: () => true, // Funds return to wallet -> positive sign
    getTitle: () => "Withdrew from Savings",
    getRows: (tx) => {
      const rows: [string, unknown, string?][] = [
        ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`],
      ];
      if (tx.savingsDetails?.penaltyFee) rows.push(["Penalty Fee", tx.savingsDetails.penaltyFee]);
      return rows;
    },
  },

  AIRTIME: {
    kind: "airtime",
    isIncoming: () => false,
    getTitle: (tx) => tx.memo || "Airtime Recharge",
    getRows: (tx) => [
      ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`],
      ["Recipient Phone", tx.toAddress, tx.toAddress],
      ["Description", tx.memo],
    ],
  },

  DATA: {
    kind: "data",
    isIncoming: () => false,
    getTitle: (tx) => tx.memo || "Data Subscription",
    getRows: (tx) => [
      ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`],
      ["Recipient Phone", tx.toAddress, tx.toAddress],
      ["Description", tx.memo],
    ],
  },
};

function buildRampOrBankRows(tx: any): Array<[string, unknown, string?]> {
  const isWithdraw =
    tx.type === "WITHDRAW" ||
    tx.type === "OFFRAMP" ||
    tx.kind === "send";

  const numAmount = Number(tx.amount || 0);
  const feePaidNum = Number(tx.feePaid || 0);

  const rows: [string, unknown, string?][] = [
    ["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`],
  ];

  if (isWithdraw && feePaidNum > 0) {
    rows.push(["Withdrawal fee", `${formatDecimal(feePaidNum, 4)} ${tx.token || ""}`]);
    const totalDebit = numAmount + feePaidNum;
    rows.push(["Total debited", `${formatDecimal(totalDebit, 4)} ${tx.token || ""}`]);
  } else if (!isWithdraw && feePaidNum > 0) {
    rows.push(["Deposit fee", `${formatDecimal(feePaidNum, 4)} ${tx.token || ""}`]);
  }

  const ramp = tx.rampDetails;
  const bank = tx.bankDetails || ramp?.bankDetails;

  if (bank) {
    if (isWithdraw) {
      // Sender's view: show recipient info
      if (bank.accountName) rows.push(["Recipient", bank.accountName]);
      if (bank.bankName) rows.push(["Recipient Bank", bank.bankName]);
      if (bank.accountNumber) rows.push(["Recipient Account", bank.accountNumber, bank.accountNumber]);
    } else {
      // Receiver's view: show sender info if available, plus receiving/destination account
      if (bank.senderName) {
        rows.push(["Sender", bank.senderName]);
      } else if (tx.fromAddress && tx.fromAddress !== "NGN_BANK_TRANSFER") {
        rows.push(["Sender", tx.fromAddress]);
      }
      if (bank.senderBank) rows.push(["Sender Bank", bank.senderBank]);
      if (bank.senderAccountNumber) rows.push(["Sender Account", bank.senderAccountNumber, bank.senderAccountNumber]);
      if (bank.bankName) rows.push(["Recipient Bank", bank.bankName]);
      if (bank.accountNumber) rows.push(["Recipient Account", bank.accountNumber, bank.accountNumber]);
    }

    const ref = bank.reference || tx.txHash;
    if (ref) rows.push(["Reference", ref, ref]);
  } else if (ramp) {
    rows.push([
      "Fiat amount",
      ramp.fiatAmount ? `${ramp.fiatCurrency} ${ramp.fiatAmount}` : "",
    ]);
    if (ramp.reference) rows.push(["Reference", ramp.reference, ramp.reference]);
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

  if (tx.chain && tx.chain !== "fiat") {
    rows.push(
      ["Network", `${tx.chain} ${tx.network || ""}`.trim()],
      ["Network fee", tx.feePaid],
    );
    if (status !== "failed") {
      rows.push(["Transaction hash", shortenKey(tx.txHash), tx.txHash]);
    }
  }

  rows.push(["Time taken", timeTaken(tx)]);
  if (status === "failed") rows.push(["Reason", tx.errorMessage]);

  return rows
    .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== "")
    .map(([label, value, copy]) => ({
      label,
      value: `${value}`.trim(),
      ...(copy ? { copy } : {}),
    }));
}

export function formatDbTransaction(tx: any) {
  const typeUpper = (tx.type || "").toUpperCase();
  const token = (tx.token || "").toUpperCase();

  const isCard = tx.rampDetails?.provider === "mercuryo" || tx.kind === "card";
  const descriptor = isCard
    ? {
        ...DEFAULT_DESCRIPTOR,
        kind: "card" as TransactionKind,
        getTitle: (t: any) => t.title || "Card deposit",
      }
    : TX_DESCRIPTORS[typeUpper] ||
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
    id: tx._id,
    kind,
    title,
    createdAt: createdAtMs,
    amount,
    status,
    chain: tx.chain,
    carrier,
    token: tx.swapDetails?.fromToken || tx.token,
    headline: `${formatDecimal(tx.swapDetails?.fromAmount ?? rawAmount, 4)} ${
      tx.swapDetails?.fromToken || tokenPart
    }`.trim(),
    heading: `${SUBJECT[kind] ?? "Transaction"} ${OUTCOME[status]}`,
    rows: detailRows(tx, status, descriptor),
  };
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

  if (params.status) filterClauses.push({ status: params.status.toUpperCase() });
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
      tx.status === "PENDING" && tx.rampDetails?.reference
        ? syncPendingRampTransaction(tx)
        : Promise.resolve(tx),
    ),
  );

  return { transactions, total };
}

// ── Status Updates & Lookups ─────────────────────────────────────────────────

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
    "rampDetails.reference": { $exists: true, $ne: null },
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
    const reference = tx.rampDetails?.reference;
    if (!reference) continue;

    const handler = getProviderHandler(tx.rampDetails?.provider);
    const isStale = tx.createdAt && new Date(tx.createdAt) < cutoffTime;

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
  }

  console.log(
    `[ResolveTx] Run complete. Checked: ${result.totalChecked} | Confirmed: ${result.confirmed} | Failed: ${result.failed} | Still Pending: ${result.stillPending}`,
  );

  return result;
}
