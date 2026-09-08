import { connectDB } from "@/lib/db";
import { Transaction, type ITransaction } from "@/models/Transaction";
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
 * Lists transactions belonging to an authenticated user, ordered newest first.
 */
export async function listTransactionsByUserId(
  userId: string,
  limit = 20,
): Promise<ITransaction[]> {
  await connectDB();
  return Transaction.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<ITransaction[]>();
}

/**
 * Retrieves a single transaction strictly scoped to the owner.
 */
export async function getTransactionById(
  id: string,
  userId: string,
): Promise<ITransaction | null> {
  await connectDB();
  return Transaction.findOne({ _id: id, userId });
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
  const isIncoming =
    tx.type === "ONRAMP" ||
    tx.type === "FAUCET" ||
    (tx.type === "TRANSFER" &&
      (tx.fromAddress === "SWITCH_NGN_BANK" ||
        tx.fromAddress?.toLowerCase().includes("faucet")));

  const isCard =
    tx.rampDetails?.provider === "mercuryo" ||
    tx.kind === "card";

  const token = (tx.token || "").toUpperCase();
  const kind: TransactionKind =
    tx.type === "SWAP"
      ? "swap"
      : token === "AIRTIME"
        ? "airtime"
        : token === "DATA"
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
  const rows: [string, unknown][] = [];
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
        ["Reference", ramp.reference],
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
    ["TXN HASH", shortenKey(tx.txHash)],
    ["Time taken", timeTaken(tx)],
  );

  if (status === "failed") rows.push(["Reason", tx.errorMessage]);

  return rows
    .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim() !== "")
    .map(([label, value]) => ({ label, value: `${value}`.trim() }));
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
}): Promise<{ transactions: any[]; total: number }> {
  await connectDB();

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const query: Record<string, any> = { userId: params.userId };

  if (params.type) {
    const t = params.type.toUpperCase();
    if (t === "UTILITY") {
      query.$or = [
        { type: "UTILITY" },
        { "rampDetails.provider": "bills" },
        { token: { $in: ["AIRTIME", "DATA", "ELECTRICITY"] } },
      ];
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

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(query),
  ]);

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

