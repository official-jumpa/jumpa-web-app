import { connectDB } from "@/lib/db";
import { Transaction, type ITransaction } from "@/models/Transaction";
import { SwitchService } from "@/lib/switch";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import type {
  TransactionDetailRow,
  TransactionKind,
} from "@/lib/wallet";

/**
 * Creates a new transaction record in MongoDB.
 */
export async function createTransactionRecord(
  data: Partial<ITransaction>,
): Promise<ITransaction> {
  await connectDB();
  return Transaction.create(data);
}

/**
 * Automatically syncs a pending Switch onramp or offramp transaction
 * against Switch provider status API, updating the DB and invalidating balance cache if complete.
 */
export async function syncPendingSwitchTransaction(tx: any): Promise<any> {
  if (!tx || tx.status !== "PENDING" || !tx.rampDetails?.reference) {
    return tx;
  }

  // Only sync Switch ramp transactions
  if (
    tx.rampDetails?.provider !== "switch" &&
    tx.type !== "ONRAMP" &&
    tx.type !== "OFFRAMP"
  ) {
    return tx;
  }

  try {
    const reference = tx.rampDetails.reference;
    const result = await SwitchService.getTransactionStatus(reference);

    if (!result.success || !result.data) {
      return tx;
    }

    const rawStatus = (result.data.status || "").toUpperCase();
    const isCompleted = [
      "COMPLETED",
      "SUCCESS",
      "SUCCESSFUL",
      "DELIVERED",
      "SETTLED",
    ].includes(rawStatus);

    const isFailed = [
      "FAILED",
      "EXPIRED",
      "CANCELLED",
      "REJECTED",
    ].includes(rawStatus);

    if (isCompleted) {
      const txHash = result.data.meta?.hash || reference;
      const explorerUrl = result.data.meta?.explorer_url || null;

      await Transaction.updateOne(
        { _id: tx._id },
        {
          $set: {
            status: "CONFIRMED",
            txHash,
            ...(explorerUrl ? { explorerUrl } : {}),
            updatedAt: new Date(),
          },
        },
      );

      tx.status = "CONFIRMED";
      tx.txHash = txHash;
      if (explorerUrl) tx.explorerUrl = explorerUrl;

      // Invalidate balance cache so user immediately sees their funds
      if (tx.userId) invalidateBalanceCache(tx.userId);
      if (tx.toAddress) invalidateBalanceCache(tx.toAddress);
      if (tx.fromAddress) invalidateBalanceCache(tx.fromAddress);

      if (tx.userId) {
        if (tx.type === "ONRAMP") {
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
        } else if (tx.type === "OFFRAMP") {
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
    } else if (isFailed) {
      await Transaction.updateOne(
        { _id: tx._id },
        {
          $set: {
            status: "FAILED",
            updatedAt: new Date(),
          },
        },
      );
      tx.status = "FAILED";
    }
  } catch (err) {
    console.warn(
      `[Transaction Sync] Notice syncing pending transaction ${tx._id}:`,
      err,
    );
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
    raw.map((tx) =>
      tx.status === "PENDING" && tx.rampDetails?.reference
        ? syncPendingSwitchTransaction(tx)
        : Promise.resolve(tx),
    ),
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
  return syncPendingSwitchTransaction(tx);
}

function formatDecimal(val: string | number, maxDecimals = 4): string {
  if (val === undefined || val === null || val === "") return "";
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return String(val);

  return num.toLocaleString(undefined, {
    maximumFractionDigits: maxDecimals,
  });
}

function formatTxDate(dateVal?: Date | string): string {
  if (!dateVal) return "";
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today, ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Yesterday, ${timeStr}`;

  const monthStr = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  return `${monthStr}, ${timeStr}`;
}

export function formatDbTransaction(tx: any) {
  const typeUpper = (tx.type || "").toUpperCase();
  const token = (tx.token || "").toUpperCase();

  const isIncoming =
    tx.type === "ONRAMP" ||
    tx.type === "FAUCET" ||
    (tx.type === "TRANSFER" &&
      (tx.fromAddress === "SWITCH_NGN_BANK" ||
        tx.fromAddress?.toLowerCase().includes("faucet")));

  const isCard =
    tx.rampDetails?.provider === "mercuryo" ||
    tx.kind === "card";

  const kind: TransactionKind =
    tx.type === "SWAP"
      ? "swap"
      : tx.type === "BRIDGE"
        ? "bridge"
        : typeUpper === "AIRTIME" || token === "AIRTIME"
          ? "airtime"
          : typeUpper === "DATA" || token === "DATA"
            ? "data"
            : tx.type === "SAVINGS_DEPOSIT" || tx.type === "SAVINGS_WITHDRAW"
              ? "invest"
              : isCard
                ? "card"
                : isIncoming
                  ? "receive"
                  : "send";

  let title = tx.title;
  if (!title) {
    if (tx.type === "SWAP") {
      const fromAmount = tx.swapDetails?.fromAmount
        ? `${formatDecimal(tx.swapDetails.fromAmount, 4)} `
        : "";
      const toAmount = tx.swapDetails?.toAmount
        ? `${formatDecimal(tx.swapDetails.toAmount, 4)} `
        : "";
      title = `Swap to ${toAmount}${tx.swapDetails?.toToken || "Asset"}`;
    } else if (tx.type === "ONRAMP") {
      title = `Deposit ${tx.token}`;
    } else if (tx.type === "OFFRAMP") {
      title = `Withdraw ${tx.token}`;
    } else if (tx.type === "FAUCET") {
      title = `Claim ${tx.token}`;
    } else if (tx.type === "SAVINGS_WITHDRAW") {
      title = `Withdrew from Savings Goal`;
    } else if (tx.type === "SAVINGS_DEPOSIT") {
      title = `Deposited to Savings Goal`;
    } else if (tx.type === "BRIDGE") {
      title = `Bridged from ${tx.bridgeDetails?.fromChain} to ${tx.bridgeDetails?.toChain}`;
    } else if (typeUpper === "AIRTIME") {
      title = tx.memo || "Airtime Recharge";
    } else if (typeUpper === "DATA") {
      title = tx.memo || "Data Subscription";
    } else if (tx.type === "TRANSFER") {
      title = `${isIncoming ? "Received" : "Sent"} ${tx.token}`;
    } else {
      title = tx.token || "Transaction";
    }
  }

  const detail = tx.detail || formatTxDate(tx.createdAt || tx.executedAt);

  let rawAmount = String(tx.amount || "").trim();
  let sign = "";
  if (rawAmount.startsWith("+")) {
    sign = "+";
    rawAmount = rawAmount.slice(1).trim();
  } else if (rawAmount.startsWith("-")) {
    sign = "-";
    rawAmount = rawAmount.slice(1).trim();
  } else {
    sign = kind === "receive" ? "+" : "-";
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

  return {
    id: tx._id,
    kind,
    title,
    detail,
    amount,
    status,
    chain: tx.chain,
    token: tx.swapDetails?.fromToken || tx.token,
    headline: `${formatDecimal(tx.swapDetails?.fromAmount ?? rawAmount, 4)} ${
      tx.swapDetails?.fromToken || tokenPart
    }`.trim(),
    heading: `${SUBJECT[kind] ?? "Transaction"} ${OUTCOME[status]}`,
    timestamp: formatTxTimestamp(tx.executedAt || tx.createdAt),
    rows: detailRows(tx, status),
  };
}

/** What the detail screen calls the transaction, above the date. */
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

/** "May 26, 2026 |  02:34pm", the form the detail screen draws. */
function formatTxTimestamp(dateVal?: Date | string): string {
  if (!dateVal) return "";
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return "";

  const day = date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = date
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
    .replace(/\s?([AP])M/i, (_m, half) => `${half.toLowerCase()}m`);

  return `${day} |  ${time}`;
}

/** Only rows the record can actually answer — an empty value is left out. */
function detailRows(tx: any, status: string): TransactionDetailRow[] {
  // Third slot is the full value to copy, where the printed one is shortened.
  const rows: [string, unknown, string?][] = [];
  const swap = tx.swapDetails;
  const ramp = tx.rampDetails;

  if (tx.type === "SWAP" && swap) {
    const bridged = /bridge|wormhole|squid/i.test(swap.protocol || "");
    rows.push(
      ["Amount sent", `${formatDecimal(swap.fromAmount, 4)} ${swap.fromToken}`],
      ["Amount received", `${formatDecimal(swap.toAmount, 4)} ${swap.toToken}`],
      ["Exchange rate", exchangeRate(swap.fromAmount, swap.toAmount)],
      ["Slippage", swap.slippage ? `${swap.slippage}%` : ""],
      [bridged ? "Bridge Provider" : "Provider", swap.protocol],
    );
  } else {
    rows.push(["Amount", `${formatDecimal(tx.amount, 4)} ${tx.token || ""}`]);
    if (ramp) {
      rows.push(
        ["Provider", ramp.provider],
        [
          "Fiat amount",
          ramp.fiatAmount ? `${ramp.fiatCurrency} ${ramp.fiatAmount}` : "",
        ],
        ["Bank", ramp.bankDetails?.bankName],
        ["Reference", ramp.reference, ramp.reference],
      );
    } else if (
      tx.type === "AIRTIME" ||
      tx.type === "DATA" ||
      tx.type === "airtime" ||
      tx.type === "data"
    ) {
      rows.push(
        ["Recipient Phone", tx.toAddress, tx.toAddress],
        ["Description", tx.memo],
      );
    } else {
      rows.push(
        ["To", shortenKey(tx.toAddress)],
        ["From", shortenKey(tx.fromAddress)],
      );
    }
  }

  rows.push(
    ["Network", tx.chain ? `${tx.chain} ${tx.network || ""}`.trim() : ""],
    ["Network fee", tx.feePaid],
    ["TXN HASH", shortenKey(tx.txHash), tx.txHash],
    ["Time taken", timeTaken(tx)],
  );

  if (status === "failed") rows.push(["Reason", tx.errorMessage]);

  return rows
    .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== "")
    .map(([label, value, copy]) => ({
      label,
      value: `${value}`.trim(),
      ...(copy ? { copy } : {}),
    }));
}

function exchangeRate(from?: string, to?: string): string {
  const a = parseFloat(String(from || ""));
  const b = parseFloat(String(to || ""));
  if (!a || !b) return "";
  return formatDecimal(b / a, 4);
}

/** Between the record being written and the chain confirming it. */
function timeTaken(tx: any): string {
  if (!tx.executedAt || !tx.createdAt) return "";
  const ms = new Date(tx.executedAt).getTime() - new Date(tx.createdAt).getTime();
  if (!isFinite(ms) || ms <= 0) return "";
  return ms < 60000 ? `${Math.round(ms / 1000)} secs` : `${Math.round(ms / 60000)} mins`;
}

/** Addresses and hashes render as GB25HB…QJDYMZ, never truncated mid-string. */
function shortenKey(value?: string): string {
  if (!value || value.length <= 18) return value || "";
  return `${value.slice(0, 8)}…${value.slice(value.length - 6)}`;
}

/**
 * Queries transactions belonging to an authenticated user with filtering and pagination.
 */
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

  const query: Record<string, any> = { userId: params.userId };

  if (params.token) {
    const tokenUpper = params.token.toUpperCase();
    const rampRegex = new RegExp(`:${params.token}$`, "i");
    const tokenMatch = [
      { token: tokenUpper },
      { "swapDetails.fromToken": tokenUpper },
      { "swapDetails.toToken": tokenUpper },
      { "rampDetails.asset": rampRegex },
    ];
    query.$or = tokenMatch;
  }

  if (params.type) {
    const t = params.type.toUpperCase();
    let typeMatch: any;
    if (t === "UTILITY") {
      typeMatch = [
        { type: "UTILITY" },
        { type: "AIRTIME" },
        { type: "DATA" },
        { type: "airtime" },
        { type: "data" },
        { "rampDetails.provider": "bills" },
        { token: { $in: ["AIRTIME", "DATA", "ELECTRICITY"] } },
      ];
    } else if (t === "AIRTIME") {
      typeMatch = [
        { type: "AIRTIME" },
        { type: "airtime" },
        { token: "AIRTIME" },
      ];
    } else if (t === "DATA") {
      typeMatch = [
        { type: "DATA" },
        { type: "data" },
        { token: "DATA" },
      ];
    } else {
      typeMatch = [{ type: t }];
    }

    if (query.$or) {
      query.$and = (query.$and || []).concat([
        { $or: query.$or },
        { $or: typeMatch },
      ]);
      delete query.$or;
    } else if (t === "UTILITY" || t === "AIRTIME" || t === "DATA") {
      query.$or = typeMatch;
    } else {
      query.type = t;
    }
  }

  if (params.status) query.status = params.status.toUpperCase();
  if (params.chain) query.chain = params.chain.toLowerCase();
  if (params.network) query.network = params.network.toLowerCase();

  if (params.duration) {
    let days = 0;
    if (params.duration === "7d" || params.duration.includes("7")) days = 7;
    else if (params.duration === "30d" || params.duration.includes("30") || params.duration.includes("1 Month")) days = 30;
    else if (params.duration === "90d" || params.duration.includes("90") || params.duration.includes("3 Months")) days = 90;

    if (days > 0) {
      const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: threshold };
    }
  }

  if (params.card) {
    const last4 = params.card.replace(/\D/g, "");
    if (last4) {
      const cardMatch = [
        { "rampDetails.provider": "card" },
        { "rampDetails.bankDetails.accountNumber": { $regex: last4 } },
        { toAddress: { $regex: last4 } },
        { fromAddress: { $regex: last4 } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: cardMatch }];
        delete query.$or;
      } else {
        query.$or = cardMatch;
      }
    }
  }

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
        ? syncPendingSwitchTransaction(tx)
        : Promise.resolve(tx),
    ),
  );

  return { transactions, total };
}

/**
 * Updates a transaction's status and optional txHash or error message.
 */
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
    { new: true },
  );
}

/**
 * Finds a transaction by its Switch ramp reference or blockchain txHash.
 * Used for querying status updates or webhook callbacks.
 */
export async function findTransactionByReference(
  reference: string,
): Promise<ITransaction | null> {
  await connectDB();
  const tx = await Transaction.findOne({
    $or: [
      { "rampDetails.reference": reference },
      { txHash: reference },
    ],
  }).lean<ITransaction>();
  return tx ?? null;
}

/**
 * Updates a transaction record matching a Switch reference or txHash.
 * Used during payment settlement checks.
 */
export async function updateTransactionByReference(
  reference: string,
  data: Partial<ITransaction> | Record<string, any>,
): Promise<boolean> {
  await connectDB();
  const res = await Transaction.updateOne(
    {
      $or: [
        { "rampDetails.reference": reference },
        { txHash: reference },
      ],
    },
    { $set: data },
  );
  return res.matchedCount > 0;
}

/**
 * Finds confirmed transactions matching any of the provided references or txHashes for a user.
 * Used for syncing chat card statuses with settled transactions.
 */
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

/**
 * Updates a transaction record by its ID.
 * Use for updating status, metadata, blockchain hashes, or settlement details.
 */
export async function updateTransactionRecord(
  id: string,
  data: Partial<ITransaction> | Record<string, any>,
): Promise<ITransaction | null> {
  await connectDB();
  const updated = await Transaction.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true },
  ).lean<ITransaction>();
  return updated ?? null;
}

/**
 * Finds recent transactions for a user after a specified cutoff date, filtered by type.
 * Used in chat history and context generation.
 */
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

/**
 * Iterates through all PENDING transactions that have a ramp reference (e.g. Switch onramp/offramp),
 * queries the Switch provider status API, and updates their status in the database.
 *
 * - COMPLETED / SUCCESSFUL / SETTLED -> CONFIRMED (txHash, explorerUrl set, cache invalidated, notifications created)
 * - FAILED / CANCELLED / REJECTED -> FAILED
 * - AWAITING_DEPOSIT / PENDING / PROCESSING:
 *     - If < staleHours old (default 24h): remains PENDING (active deposit window)
 *     - If >= staleHours old: marked FAILED ("Deposit window expired")
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
    `[ResolveTx] Starting resolution run... Found ${pendingTxs.length} pending transaction(s) with Switch references (stale threshold: ${staleHours}h)`,
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

    try {
      const statusRes = await SwitchService.getTransactionStatus(reference);
      const rawStatus = (statusRes?.data?.status || "").toUpperCase();

      const isCompleted = [
        "COMPLETED",
        "SUCCESS",
        "SUCCESSFUL",
        "DELIVERED",
        "SETTLED",
      ].includes(rawStatus);

      const isExplicitFailed = [
        "FAILED",
        "CANCELLED",
        "REJECTED",
      ].includes(rawStatus);

      const isStale = tx.createdAt && new Date(tx.createdAt) < cutoffTime;

      if (isCompleted) {
        const txHash = statusRes.data?.meta?.hash || reference;
        const explorerUrl = statusRes.data?.meta?.explorer_url || null;

        await Transaction.updateOne(
          { _id: tx._id },
          {
            $set: {
              status: "CONFIRMED",
              txHash,
              ...(explorerUrl ? { explorerUrl } : {}),
              updatedAt: new Date(),
            },
          },
        );

        console.log(
          `[ResolveTx] ✅ Confirmed tx ${tx._id} (${tx.amount} ${tx.token}, ref: ${reference}) -> CONFIRMED (hash: ${txHash})`,
        );

        if (tx.userId) invalidateBalanceCache(tx.userId);
        if (tx.toAddress) invalidateBalanceCache(tx.toAddress);
        if (tx.fromAddress) invalidateBalanceCache(tx.fromAddress);

        if (tx.userId) {
          if (tx.type === "ONRAMP") {
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
          } else if (tx.type === "OFFRAMP") {
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

        result.confirmed++;
        result.details.push({
          id: tx._id,
          reference,
          type: tx.type,
          amount: tx.amount,
          token: tx.token,
          previousStatus: "PENDING",
          newStatus: "CONFIRMED",
          providerStatus: rawStatus || "COMPLETED",
        });
      } else if (isExplicitFailed) {
        await Transaction.updateOne(
          { _id: tx._id },
          {
            $set: {
              status: "FAILED",
              errorMessage: statusRes?.message || "Transaction failed at provider",
              updatedAt: new Date(),
            },
          },
        );

        console.log(
          `[ResolveTx] ❌ Failed tx ${tx._id} (${tx.amount} ${tx.token}, ref: ${reference}) -> FAILED (${statusRes?.message || "Failed at provider"})`,
        );

        result.failed++;
        result.details.push({
          id: tx._id,
          reference,
          type: tx.type,
          amount: tx.amount,
          token: tx.token,
          previousStatus: "PENDING",
          newStatus: "FAILED",
          providerStatus: rawStatus || "FAILED",
          reason: statusRes?.message || "Failed at provider",
        });
      } else if (isStale) {
        // Older than staleHours (24h) and not completed -> deposit window expired
        await Transaction.updateOne(
          { _id: tx._id },
          {
            $set: {
              status: "FAILED",
              errorMessage: "Deposit window expired",
              updatedAt: new Date(),
            },
          },
        );

        console.log(
          `[ResolveTx] ⌛ Expired tx ${tx._id} (${tx.amount} ${tx.token}, ref: ${reference}) -> FAILED (Deposit window expired > ${staleHours}h)`,
        );

        result.failed++;
        result.details.push({
          id: tx._id,
          reference,
          type: tx.type,
          amount: tx.amount,
          token: tx.token,
          previousStatus: "PENDING",
          newStatus: "FAILED",
          providerStatus: rawStatus || "EXPIRED",
          reason: `Deposit window expired (> ${staleHours}h)`,
        });
      } else {
        // Recent transaction within active window (< 24h)
        console.log(
          `[ResolveTx] ⏳ Tx ${tx._id} (${tx.amount} ${tx.token}, ref: ${reference}) still PENDING (Switch: ${rawStatus || "AWAITING_DEPOSIT"})`,
        );

        result.stillPending++;
        result.details.push({
          id: tx._id,
          reference,
          type: tx.type,
          amount: tx.amount,
          token: tx.token,
          previousStatus: "PENDING",
          newStatus: "PENDING",
          providerStatus: rawStatus || "AWAITING_DEPOSIT",
          reason: "Within active deposit window (< 24h)",
        });
      }
    } catch (err: any) {
      console.error(`[ResolveTx] ⚠️ Error resolving reference ${reference}:`, err?.message || err);
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
        reason: err?.message || "Error contacting Switch provider",
      });
    }
  }

  console.log(
    `[ResolveTx] Run complete. Checked: ${result.totalChecked} | Confirmed: ${result.confirmed} | Failed: ${result.failed} | Still Pending: ${result.stillPending}`,
  );

  return result;
}


